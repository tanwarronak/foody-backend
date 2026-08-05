# Backend Foody API Documentation

This backend uses session-based authentication with Passport and cookie sessions. The frontend should send requests with credentials enabled so the session cookie is included on protected routes.

## Base URLs

- Users: `/api/users`
- Restaurants: `/api/restaurants`
- Menu items: `/api/menuitems`
- Carts: `/api/carts`
- Orders: `/api/orders`
- Payments: `/api/payments`

## Authentication and access rules

- Public routes do not require authentication.
- Protected routes require a valid authenticated session cookie.
- Admin routes require the authenticated user to have `role: "admin"`.
- Delivery partner routes require the authenticated user to have `role: "deliveryPerson"` where enforced in controller logic.
- File upload routes use multipart/form-data and expect an `image` field.

## Frontend request requirements

- For protected APIs, include cookies in the request.
- For JSON requests, send `Content-Type: application/json`.
- For upload requests, send `Content-Type: multipart/form-data` and append both text fields and the `image` file.
- When an API uses a path parameter, the frontend must supply the ID in the URL, not in the body.

## Frontend data representation guide

This section explains what the frontend will receive from each API and how to render it in screens, cards, tables, and detail views.

### Common patterns

- Any field that ends with `_id` is a MongoDB reference and can be used as the primary identifier in the UI.
- Image fields are usually returned as a fully usable URL in list/detail responses, even if the database stores a blob name.
- List APIs typically return an array or an object containing an array. The frontend should map over that array to create cards or table rows.
- Detail APIs usually return one object. The frontend should bind that object directly to a detail page, edit form, or drawer.
- Nested arrays such as order items or cart items should be rendered as line-item sections under the main entity.

### User profile response

#### GET `/api/users/profile`

Example response:

```json
{
	"name": "Rahul Sharma",
	"email": "rahul@example.com",
	"address": "MG Road, Bengaluru",
	"phone": 9876543210
}
```

How to represent it in the frontend:

- Show `name` as the profile title.
- Show `email` as read-only identity information.
- Show `address` in an address section or editable text area.
- Show `phone` in the contact number field.

#### GET `/api/users/admin/profile`

Example response:

```json
{
	"name": "Admin Owner",
	"address": "Koramangala, Bengaluru",
	"phone": 9876543210,
	"email": "owner@example.com",
	"totalOrders": 42,
	"totalIncome": 18500
}
```

How to represent it in the frontend:

- Render `name`, `email`, `phone`, and `address` in the owner profile card.
- Render `totalOrders` as an order-count metric tile.
- Render `totalIncome` as a revenue summary tile.

### Restaurant response shapes

#### GET `/api/restaurants/getrestaurants`

Example response:

```json
{
	"restaurants": [
		{
			"_id": "66aa1111",
			"r_name": "Spice Corner",
			"description": "North Indian and street food",
			"image": "https://.../restaurant-image.jpg",
			"phone": 9876543210,
			"email": "spice@example.com",
			"owner_id": "66bb2222",
			"orders": [],
			"is_open": true,
			"opening_time": "09:00 AM",
			"closing_time": "11:00 PM",
			"__v": 0
		}
	]
}
```

How to represent it in the frontend:

- Use each restaurant object as a restaurant card.
- Show `image` as the hero image.
- Use `r_name` as the restaurant title.
- Use `description` as the short description.
- Use `is_open` to show open/closed status.
- Use `opening_time` and `closing_time` for operating hours.

#### GET `/api/restaurants/getrestaurant/:id`

Example response:

```json
{
	"restaurant": {
		"_id": "66aa1111",
		"r_name": "Spice Corner",
		"description": "North Indian and street food",
		"image": "https://.../restaurant-image.jpg",
		"phone": 9876543210,
		"email": "spice@example.com",
		"owner_id": "66bb2222",
		"orders": [],
		"is_open": true,
		"opening_time": "09:00 AM",
		"closing_time": "11:00 PM"
	}
}
```

How to represent it in the frontend:

- Bind the single `restaurant` object to a restaurant detail page.
- Show image, name, description, contact details, and timing in separate sections.

### Menu response shapes

#### GET `/api/menuitems/getmenuitems`

Example response:

```json
{
	"menuList": [
		{
			"_id": "66cc3333",
			"res_id": "66aa1111",
			"name": "Paneer Butter Masala",
			"description": "Creamy paneer curry",
			"price": 220,
			"image": "https://.../menu-image.jpg",
			"category": "Main Course",
			"is_available": true,
			"__v": 0
		}
	]
}
```

How to represent it in the frontend:

- Use each item as a menu card.
- Show `image` in the thumbnail area.
- Show `name` as the item title.
- Show `description` below the title.
- Show `price` as the price label.
- Show `category` as a tag or pill.
- Use `is_available` to disable the add-to-cart action when needed.

#### GET `/api/menuitems/getmenuitem/:restaurant_id`

Example response:

```json
{
	"menuItems": [
		{
			"_id": "66cc3333",
			"res_id": "66aa1111",
			"name": "Paneer Butter Masala",
			"description": "Creamy paneer curry",
			"price": 220,
			"image": "66cc-image-name-in-azure",
			"category": "Main Course",
			"is_available": true
		}
	]
}
```

How to represent it in the frontend:

- Use this for restaurant-specific menu pages.
- Since this endpoint returns stored image identifiers rather than guaranteed read URLs, the frontend should rely on the image value returned here only if the backend already transformed it in the response. If not, use the list endpoint or a dedicated image URL source.

### Cart response shapes

#### GET `/api/carts/view`

Example response:

```json
{
	"cart": {
		"_id": "66dd4444",
		"user_id": "66ee5555",
		"res_id": "66aa1111",
		"menu": [
			{
				"menu_item_id": {
					"_id": "66cc3333",
					"name": "Paneer Butter Masala",
					"price": 220,
					"image": "https://.../menu-image.jpg"
				},
				"quantity": 2
			}
		]
	}
}
```

How to represent it in the frontend:

- Render the cart as a list of line items.
- Each line item should show item image, item name, unit price, quantity selector, and line total.
- `res_id` can be used to show which restaurant the cart belongs to.
- The cart footer should calculate subtotal from each line total.

### Order response shapes

#### POST `/api/orders/placeorder`

Online payment example response:

```json
{
	"razorpayOrder": {
		"id": "order_razorpay_123",
		"amount": 29900,
		"currency": "INR",
		"receipt": "receipt_1722850000000"
	},
	"orderId": "66ff6666"
}
```

COD example response:

```json
{
	"message": "Order placed successfully"
}
```

How to represent it in the frontend:

- For online payment, open the Razorpay checkout using `razorpayOrder` and keep `orderId` for payment verification.
- For COD, show a confirmation screen and redirect the user to the order history or success page.

#### GET `/api/orders/myorders`

Example response:

```json
[
	{
		"_id": "66ff6666",
		"restaurantName": "Spice Corner",
		"restaurantId": "66aa1111",
		"items": [
			{
				"restaurantId": "66aa1111",
				"menu_item_id": "66cc3333",
				"quantity": 2,
				"price": 220,
				"name": "Paneer Butter Masala"
			}
		],
		"subtotal": 440,
		"deliveryFee": 44,
		"platformFee": 10,
		"total": 494,
		"status": "pending",
		"payment_status": "pending",
		"payment_method": "online",
		"address": "MG Road, Bengaluru",
		"createdAt": "2026-08-05T10:15:00.000Z"
	}
]
```

How to represent it in the frontend:

- Render each order as an order history card or row.
- Show `restaurantName` as the main label.
- Show `status` as the order badge.
- Show `payment_status` and `payment_method` as payment labels.
- Show `items` as an expandable line-item list.
- Show `subtotal`, `deliveryFee`, `platformFee`, and `total` in the price summary.
- Show `address` and `createdAt` in the order meta area.

#### GET `/api/orders/getorders`

Example response:

```json
[
	{
		"_id": "66ff6666",
		"customerName": "Rahul Sharma",
		"customerPhone": 9876543210,
		"items": [
			{
				"menu_item_id": "66cc3333",
				"quantity": 2,
				"price": 220,
				"name": "Paneer Butter Masala"
			}
		],
		"subtotal": 440,
		"deliveryFee": 44,
		"platformFee": 10,
		"total": 494,
		"status": "accepted",
		"payment_status": "paid",
		"payment_method": "online",
		"address": "MG Road, Bengaluru",
		"createdAt": "2026-08-05T10:15:00.000Z",
		"estimated_delivery_time": "2026-08-05T10:55:00.000Z"
	}
]
```

How to represent it in the frontend:

- Render this in the restaurant owner dashboard as an order management list.
- Show the customer name and phone at the top of each card.
- Show the current order status as a status chip.
- Show the ETA using `estimated_delivery_time`.

#### GET `/api/orders/order/:id`

Customer example response:

```json
[
	{
		"user_id": "66ee5555",
		"menu_items": [
			{
				"name": "Paneer Butter Masala",
				"description": "Creamy paneer curry",
				"price": 220,
				"category": "Main Course"
			}
		],
		"order_status": "pending",
		"payment_status": "pending",
		"restaurant_name": "Spice Corner",
		"restaurant_description": "North Indian and street food",
		"restaurant_contact": 9876543210,
		"subtotal": 440,
		"delivery_fee": 44,
		"platform_fee": 10,
		"total_amount": 494
	}
]
```

Admin example response:

```json
{
	"menu_items": [
		{
			"name": "Paneer Butter Masala",
			"description": "Creamy paneer curry",
			"price": 220,
			"category": "Main Course"
		}
	],
	"payment_status": "paid",
	"customer_name": "Rahul Sharma",
	"order_status": "accepted",
	"delivery_partner_name": "Amit Kumar",
	"delivery_partner_contact": 9876500000,
	"subtotal": 440
}
```

How to represent it in the frontend:

- Use the customer version for the customer order detail page.
- Use the admin version for the restaurant owner order detail panel.
- Render `menu_items` as an item list with name, description, price, and category.

### Payment response shapes

#### GET `/api/payments/paymenthistory/:order_id`

Example response:

```json
{
	"payments": [
		{
			"order_id": "66ff6666",
			"payment_order_id": "order_razorpay_123",
			"payment_method": "online",
			"amount": 494,
			"payment_status": "paid",
			"transaction_id": "pay_razorpay_456",
			"paid_at": "2026-08-05T10:20:00.000Z"
		}
	]
}
```

How to represent it in the frontend:

- Show this as a payment history timeline or a payment summary box.
- `payment_status` should drive the payment badge.
- `amount` should be displayed as the paid amount.
- `transaction_id` can be shown in a receipt or support section.

### Frontend UI mapping summary

- Profile page: bind the user profile object directly to the form fields.
- Restaurant listing page: map over `restaurants` and render each restaurant as a clickable card.
- Menu page: map over `menuList` or `menuItems` and render each item as an add-to-cart card.
- Cart page: map over `cart.menu` and render each line item with quantity controls.
- Order history page: map over the order array and render status, amounts, address, and line items.
- Order detail page: render the single order object, then render nested arrays for item details.
- Owner dashboard: render metrics from admin profile and order cards from the order list.
- Payment page: use `razorpayOrder` for checkout and then call verification using the saved `orderId`.

## Users APIs

| Method | Endpoint | Access | Payload / Params | What the frontend should send | Response data |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/users/auth/google` | Public | None | Redirect user to Google login | Google OAuth redirect |
| GET | `/api/users/auth/google/callback` | Public callback | None | Handled by Google redirect flow | Redirects to `/api/users/profile` on success |
| GET | `/api/users/profile` | Authenticated customer | None | Session cookie only | `{ name, email, address, phone }` |
| PUT | `/api/users/profile` | Authenticated customer | Body: `{ name, address, phone }` | Send updated profile fields as JSON | Updated profile object with `{ name, email, address, phone }` |
| POST | `/api/users/logout` | Authenticated customer | None | Session cookie only | `{ success: true, message }` |
| GET | `/api/users/admin/profile` | Authenticated admin | None | Session cookie only | `{ name, address, phone, email, totalOrders, totalIncome }` |
| PUT | `/api/users/admin/profile` | Authenticated admin | Body: `{ name, address, phone }` | Same payload as customer profile update | Updated profile object with `{ name, email, address, phone }` |
| POST | `/api/users/admin/logout` | Authenticated admin | None | Session cookie only | `{ success: true, message }` |

### Notes for user profile screens

- `phone` is validated on the server to be exactly 10 digits.
- The frontend should keep the session alive by sending credentials on every protected request.
- `getAdminProfile` also calculates summary stats from the admin-owned restaurant orders.

## Restaurants APIs

| Method | Endpoint | Access | Payload / Params | What the frontend should send | Response data |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/restaurants/register` | Authenticated admin | Multipart body: `{ name, description, phone, email, address, opening_time, closing_time, image }` | Upload restaurant image in `image` and send the other fields as form data | `{ message, restaurant, imageUrl }` |
| GET | `/api/restaurants/getrestaurants` | Public | None | No auth required | `{ restaurants: [...] }` |
| GET | `/api/restaurants/getrestaurant/:id` | Public | URL param: `id` | Put restaurant ID in the URL | `{ restaurant }` |
| PUT | `/api/restaurants/updaterestaurant/:id` | Authenticated admin | Multipart body: `{ name, description, phone, email, address, opening_time, closing_time, image? }` | Use the restaurant ID in the URL and send updated fields; if the image is changed, send it as `image` | `{ message, restaurant }` |
| DELETE | `/api/restaurants/deleterestaurant/:id` | Authenticated admin | URL param: `id` | Put restaurant ID in the URL | `{ message }` |

### Notes for restaurant flows

- The create flow stores the uploaded file in Azure storage and returns a public read URL as `imageUrl`.
- Restaurant phone numbers are validated to be 10 digits.
- The frontend should use multipart form data for create/update when uploading an image.

## Menu APIs

| Method | Endpoint | Access | Payload / Params | What the frontend should send | Response data |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/menuitems/additem/` | Authenticated admin | Multipart body: `{ name, description, price, category, image }` | Send menu item details and image in form data | `{ message, menuItem, imageUrl }` |
| PUT | `/api/menuitems/updateitem/:id` | Authenticated admin | Multipart body: `{ name, description, price, category, image? }` | Use menu item ID in the URL and include the updated fields | `{ message, updatedMenuItem }` |
| DELETE | `/api/menuitems/removeitem/:id` | Authenticated admin | URL param: `id` | Put menu item ID in the URL | `{ message, deletedMenuItem }` |
| GET | `/api/menuitems/getmenuitems` | Public | None | No auth required | `{ menuList: [...] }` |
| GET | `/api/menuitems/getmenuitem/:restaurant_id` | Authenticated user | URL param: `restaurant_id` | Put restaurant ID in the URL | `{ menuItems }` |

### Notes for menu screens

- Menu item creation and updates use Azure storage for images.
- The public menu list endpoint returns every item across restaurants.
- The restaurant-specific menu endpoint is protected, so the frontend should send the session cookie.

## Cart APIs

| Method | Endpoint | Access | Payload / Params | What the frontend should send | Response data |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/carts/add` | Authenticated user | Body: `{ itemId, restaurantId, quantity }` | Send the selected menu item ID, restaurant ID, and quantity | `{ message, cart }` |
| GET | `/api/carts/view` | Authenticated user | None | Session cookie only | `{ cart }` |
| DELETE | `/api/carts/remove/:itemId` | Authenticated user | URL param: `itemId` | Put menu item ID in the URL | `{ message, cart }` |
| PUT | `/api/carts/update/:itemId` | Authenticated user | Body: `{ quantity }` | Put menu item ID in the URL and send the new quantity | `{ message, cart }` |

### Notes for cart flows

- The cart is scoped to the logged-in user.
- `add` creates a cart if one does not exist yet.
- The frontend should treat `cart.menu` as the list of line items and each line item references `menu_item_id`.

## Orders APIs

| Method | Endpoint | Access | Payload / Params | What the frontend should send | Response data |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/orders/placeorder` | Authenticated user | Body: `{ cartId, payment_method, address }` | Send the cart ID, selected payment method, and delivery address if different from profile address | Online payment: `{ razorpayOrder, orderId }`; COD: `{ message }` |
| GET | `/api/orders/myorders` | Authenticated customer | None | Session cookie only | Array of order summaries for the customer |
| GET | `/api/orders/order/:id` | Authenticated user | URL param: `id` | Put order ID in the URL | Customer gets an array-like aggregated order result; admin gets a single order object |
| GET | `/api/orders/getorders` | Authenticated admin | None | Session cookie only | Array of order summaries for the restaurant owner |
| GET | `/api/orders/getorder/:id` | Authenticated admin | URL param: `id` | Put order ID in the URL | Aggregated order object for admin |
| PUT | `/api/orders/updateorderstatus/:id` | Authenticated admin | Body: `{ order_status }` | Put order ID in the URL and send the next allowed status | `{ message }` |
| GET | `/api/orders/getassignedorders` | Authenticated delivery partner | None | Session cookie only | Array of assigned orders |
| PUT | `/api/orders/updateorderstatus/:id` | Authenticated user | Body expected by delivery flow, but handler is currently empty | This route exists for delivery status updates but the controller has no implementation yet | No implemented response payload |

### Order placement payload details

- `cartId` must be the MongoDB id of the logged-in user’s cart.
- `payment_method` must be either `online` or `cod`.
- `address` is optional; if omitted, the backend falls back to the user profile address.
- For online orders, the backend creates a Razorpay order and returns `razorpayOrder` plus the created `orderId`.
- For COD, the backend creates both the order and a payment record immediately.

### Order response shape for the frontend

- Customer order list responses include restaurant name, item summaries, subtotal, delivery fee, platform fee, total, payment status, payment method, address, and created date.
- Restaurant owner order list responses include customer name, customer phone, item summaries, subtotal, fees, total, status, payment details, address, and created date.
- Customer order detail responses include restaurant details and the menu items inside the order.
- Admin order detail responses include customer and delivery partner details.

### Order status notes

- Admin order updates only allow valid status transitions.
- Delivery partner assignment fetching only works if the user role is `deliveryPerson`.
- The delivery status update controller is currently empty, so the frontend should not rely on that route yet.

## Payments APIs

| Method | Endpoint | Access | Payload / Params | What the frontend should send | Response data |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/payments/verifyorder/:order_id` | Authenticated user | URL param: `order_id`; body: `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id? }` | Send Razorpay callback fields after payment success; the backend verifies the signature | `{ message }` |
| POST | `/api/payments/verifyorder/webhook` | Authenticated user | Body expected from webhook provider | Webhook flow is stubbed and currently has no implementation | No implemented response payload |
| GET | `/api/payments/paymenthistory/:order_id` | Authenticated user | URL param: `order_id` | Put order ID in the URL | `{ payments }` |

### Notes for payment verification

- Online payment verification uses Razorpay signature checking on the server.
- After successful verification, the backend creates a payment record and marks the order as paid.
- The frontend should preserve the `orderId` returned from order creation and send it back during verification.

## Important implementation notes

- `menuitems/additem/` currently reads `restaurant_id` in the controller, but the route itself does not define a `:restaurant_id` parameter. If the frontend calls this endpoint as-is, the restaurant id is not available from the URL.
- `orders/updateorderstatus/:id` appears twice in the router: one protected by admin-only access for restaurant order status updates and one intended for delivery updates. The delivery handler is empty, so only the admin flow is fully implemented right now.
- The order status enum in the model uses `ready_for_pickup`, while the controller transition map uses `ready for pickup` in one place. The frontend should follow the backend behavior carefully until that mismatch is resolved.
- `getUserProfile`, `getAdminProfile`, `getAllOrders`, `getOrderById`, and the cart APIs all depend on a valid session cookie. If the frontend omits credentials, these routes will fail with unauthorized responses.

## Frontend integration checklist

1. Keep the session cookie attached to every protected request.
2. Use multipart/form-data for restaurant and menu image uploads.
3. Pass IDs in the URL for all detail, update, and delete endpoints.
4. For order placement, send the cart id and payment method from the checkout screen.
5. For online payments, store the returned Razorpay order id and verify it after payment success.
6. Use the returned response shapes directly for profile, cart, restaurant, menu, order, and payment screens.
