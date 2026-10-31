// for logged in user only

export const isAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    next();
};

// for admin only
export const isAdmin = (req, res, next) => {
    if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden access" });
    }

    next();
};
