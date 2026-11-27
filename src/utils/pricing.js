export function calculatePricing(subtotal, discount = 0) {
    const serviceFee = subtotal > 400 ? 18 : subtotal > 250 ? 12 : subtotal > 150 ? 6 : 0;
    const platformFee = 11;
    const deliveryFee = 21;
    const appliedDiscount = Math.min(subtotal, Math.max(0, discount));
    return { subtotal, platformFee, serviceFee, deliveryFee, discount: appliedDiscount,
        total: Math.round((subtotal + platformFee + serviceFee + deliveryFee - appliedDiscount) * 100) / 100 };
}
