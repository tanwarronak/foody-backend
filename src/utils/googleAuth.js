import {Strategy as GoogleStrategy} from 'passport-google-oauth20';
import passport from 'passport';
import { User } from '../models/userModel.js'; 


export default function setupGoogleAuth() {
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
},async function(accessToken,refreshToken,profile,done){
    try {
        const user = await User.findOne({googleId:profile.id});
        if(user){
            return done(null,user);
        }
        else{
            const newUser = new User({
                name:profile.displayName,
                email:profile.emails[0].value,
                googleId:profile.id,
            });
            await newUser.save();
            return done(null,newUser);
        }
    } catch (error) {
        return done(error, null);
    }
})
);

passport.serializeUser((user, done) =>{
    done(null, user.id);
});
passport.deserializeUser(async (userId, done) =>{
    const user = await User.findById(userId);
    done(null, user);
});
}