const passport = require("passport");
const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const { UnauthorizedException } = require("../utils/app-error");
const { Env } = require("./env.config");
const { findByIdUserService } = require("../services/user.service");

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => {
          const token = req.cookies.accessToken;
          if (!token) throw new UnauthorizedException("Unauthorized access");
          return token;
        },
      ]),
      secretOrKey: Env.JWT_SECRET,
      audience: ["user"],
      algorithms: ["HS256"],
    },
    async ({ userId }, done) => {
      try {
        const user = userId && (await findByIdUserService(userId));
        return done(null, user || false);
      } catch (error) {
        return done(null, false);
      }
    }
  )
);

const passportAuthenticateJwt = passport.authenticate("jwt", {
  session: false,
});

module.exports = { passportAuthenticateJwt };
