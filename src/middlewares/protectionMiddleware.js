import errorHandler from "../utils/errorHandler.js";


// for logged in user only
export const isAuthenticated = async(req,res,next) =>{
    const token = req.headers.cookie;
    if(!token){
        return new errorHandler('unauthorized token',401);
    }
    if(!req.isAuthenticated || !req.isAuthenticated()){
        return new errorHandler('unauthorized token',401);
    }
    next();
}

// for admin only

export const isAdmin = async(req,res,next) =>{
    if(req.user?.role !== 'admin'){
        return new errorHandler('forbidden access',403);
    } 
    next();
};
