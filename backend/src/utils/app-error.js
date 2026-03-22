const { HTTPSTATUS } = require("../config/http.config");

const ErrorCodes = {
  ERR_INTERNAL: "ERR_INTERNAL",
  ERR_BAD_REQUEST: "ERR_BAD_REQUEST",
  ERR_UNAUTHORIZED: "ERR_UNAUTHORIZED",
  ERR_FORBIDDEN: "ERR_FORBIDDEN",
  ERR_NOT_FOUND: "ERR_NOT_FOUND",
};

class AppError extends Error {
  constructor(
    message,
    statusCode = HTTPSTATUS.INTERNAL_SERVER_ERROR,
    errorCode = ErrorCodes.ERR_INTERNAL
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

class InternalServerException extends AppError {
  constructor(message = "Internal Server Error") {
    super(message, HTTPSTATUS.INTERNAL_SERVER_ERROR, ErrorCodes.ERR_INTERNAL);
  }
}

class NotFoundException extends AppError {
  constructor(message = "Resource Not Found") {
    super(message, HTTPSTATUS.NOT_FOUND, ErrorCodes.ERR_NOT_FOUND);
  }
}

class BadRequestException extends AppError {
  constructor(message = "Bad Request") {
    super(message, HTTPSTATUS.BAD_REQUEST, ErrorCodes.ERR_BAD_REQUEST);
  }
}

class UnauthorizedException extends AppError {
  constructor(message = "Unauthorized Access") {
    super(message, HTTPSTATUS.UNAUTHORIZED, ErrorCodes.ERR_UNAUTHORIZED);
  }
}

module.exports = {
  ErrorCodes,
  AppError,
  InternalServerException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
};
