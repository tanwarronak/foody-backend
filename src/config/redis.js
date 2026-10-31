import { createClient } from "redis";

const redisClient = createClient({
    url: process.env.REDIS_URL
});

redisClient.on("error", (err) => {
    console.error("Redis Client Error:", err);
});

redisClient.on("connect", () => {
    console.log("Redis connecting...");
});

redisClient.on("ready", () => {
    console.log("Redis connected successfully");
});

redisClient.on("reconnecting", () => {
    console.log("Redis reconnecting...");
});

export default redisClient;
