import express from 'express';
import { Coupon } from '../models/couponModel.js';
import { Cart_items } from '../models/cartModel.js';
import { isAdmin, isAuthenticated } from '../middlewares/protectionMiddleware.js';
import { availableCouponFilter, couponDiscount, validCouponValues } from '../utils/coupons.js';
import { calculatePricing } from '../utils/pricing.js';

const router = express.Router();
router.post('/quote', isAuthenticated, async (req, res) => {
  try {
    if (typeof req.body.code !== 'string' || !req.body.code.trim()) return res.status(400).json({ message: 'Enter a coupon code' });
    const cart = await Cart_items.findById(req.body.cartId).populate('menu.menu_item_id');
    if (!cart || String(cart.user_id) !== String(req.user._id)) return res.status(404).json({ message: 'Cart not found' });
    if (!cart.menu.length || cart.menu.some(line => !line.menu_item_id)) return res.status(400).json({ message: 'Cart is empty or contains unavailable items' });
    const coupon = await Coupon.findOne(availableCouponFilter(req.body.code));
    if (!coupon) return res.status(400).json({ message: 'Coupon is invalid, expired, or exhausted' });
    const subtotal = cart.menu.reduce((sum, line) => sum + line.quantity * line.menu_item_id.price, 0);
    return res.json({ code: coupon.code, ...calculatePricing(subtotal, couponDiscount(coupon, subtotal)) });
  } catch (error) { return res.status(500).json({ message: 'Unable to validate coupon' }); }
});
router.get('/', isAuthenticated, isAdmin, async (_req, res) => {
  try { return res.json({ coupons: await Coupon.find().sort({ createdAt: -1 }) }); }
  catch { return res.status(500).json({ message: 'Unable to load coupons' }); }
});
router.post('/', isAuthenticated, isAdmin, async (req, res) => {
  const { code, type, value, expires_at, usage_limit } = req.body;
  if (!validCouponValues({ code, type, value, expires_at, usage_limit })) return res.status(400).json({ message: 'Enter a valid code, discount, future expiry and usage limit' });
  try {
    const coupon = await Coupon.create({ code: code.trim().toUpperCase(), type, value, expires_at, usage_limit });
    return res.status(201).json({ coupon });
  } catch (error) { return res.status(error.code === 11000 ? 409 : 500).json({ message: error.code === 11000 ? 'Coupon code already exists' : 'Unable to create coupon' }); }
});
router.patch('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    if (Object.keys(req.body).length === 1 && typeof req.body.active === 'boolean') {
      coupon.active = req.body.active;
      await coupon.save();
      return res.json({ coupon });
    }
    const values = { code: req.body.code ?? coupon.code, type: req.body.type ?? coupon.type,
      value: req.body.value ?? coupon.value, expires_at: req.body.expires_at ?? coupon.expires_at,
      usage_limit: req.body.usage_limit ?? coupon.usage_limit };
    if (!validCouponValues(values) || values.usage_limit < coupon.usage_count ||
        (req.body.active !== undefined && typeof req.body.active !== 'boolean')) return res.status(400).json({ message: 'Invalid coupon details or usage limit' });
    const updated = await Coupon.findOneAndUpdate(
      { _id: coupon._id, usage_count: { $lte: values.usage_limit } },
      { ...values, code: values.code.trim().toUpperCase(), active: req.body.active ?? coupon.active },
      { returnDocument: 'after', runValidators: true },
    );
    if (!updated) return res.status(409).json({ message: 'Usage increased; choose a higher limit' });
    return res.json({ coupon: updated });
  } catch (error) { return res.status(error.code === 11000 ? 409 : 500).json({ message: error.code === 11000 ? 'Coupon code already exists' : 'Unable to update coupon' }); }
});
export default router;
