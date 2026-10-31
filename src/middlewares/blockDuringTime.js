import { DateTime } from "luxon";

const blockDuringTime = (startTime, endTime) => {
    return (req, res, next) => {
        const now = DateTime.now().setZone("Asia/Kolkata");

        const currentMinutes =
            now.hour * 60 + now.minute;

        const [startHour, startMinute] = startTime.split(":").map(Number);
        const [endHour, endMinute] = endTime.split(":").map(Number);

        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        let isBlocked;

        // Schedule crosses midnight
        if (startMinutes > endMinutes) {
            isBlocked =
                currentMinutes >= startMinutes ||
                currentMinutes < endMinutes;
        } else {
            isBlocked =
                currentMinutes >= startMinutes &&
                currentMinutes < endMinutes;
        }

        if (isBlocked) {
            return res.status(503).json({
                success: false,
                message: "This service is currently unavailable.",
                availableFrom: "10:30 AM",
                timezone: "Asia/Kolkata"
            });
        }

        next();
    };
};

export default blockDuringTime;
