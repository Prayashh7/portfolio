import rateLimit from "express-rate-limit";

const respond = (message) => (req, res) => {
  res.status(429).json({ error: { message } });
};

/* A public portfolio should stay up under a crawl or a burst of curiosity, so the
   ceiling here is high enough that a real visitor will never see it. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: respond("Too many requests. Give it a minute and try again."),
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: respond("Too many sign-in attempts. Try again in 15 minutes."),
});

export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: respond("You have already sent several messages. Try again later, or use the email address listed on the page."),
});
