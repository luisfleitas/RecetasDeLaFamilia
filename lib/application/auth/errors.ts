export const AUTH_MESSAGE_CODES = {
  INVALID_JSON_BODY: "invalid_json_body",
  INVALID_LOGIN_PAYLOAD: "invalid_login_payload",
  INVALID_REGISTRATION_PAYLOAD: "invalid_registration_payload",
  INVALID_CHANGE_PASSWORD_PAYLOAD: "invalid_change_password_payload",
  REQUIRED_FIRST_NAME: "required_first_name",
  REQUIRED_LAST_NAME: "required_last_name",
  REQUIRED_EMAIL: "required_email",
  REQUIRED_USERNAME: "required_username",
  REQUIRED_PASSWORD: "required_password",
  REQUIRED_USERNAME_OR_EMAIL: "required_username_or_email",
  PASSWORD_TOO_SHORT: "password_too_short",
  REQUIRED_CURRENT_PASSWORD: "required_current_password",
  REQUIRED_NEW_PASSWORD: "required_new_password",
  NEW_PASSWORD_TOO_SHORT: "new_password_too_short",
  INVALID_CREDENTIALS: "invalid_credentials",
  EMAIL_IN_USE: "email_in_use",
  USERNAME_IN_USE: "username_in_use",
  EMAIL_OR_USERNAME_IN_USE: "email_or_username_in_use",
  UNAUTHORIZED: "unauthorized",
  CURRENT_PASSWORD_INCORRECT: "current_password_incorrect",
  UNEXPECTED_LOGIN_ERROR: "unexpected_login_error",
  UNEXPECTED_REGISTER_ERROR: "unexpected_register_error",
  UNEXPECTED_CHANGE_PASSWORD_ERROR: "unexpected_change_password_error",
  UNEXPECTED_LOGOUT_ERROR: "unexpected_logout_error",
} as const;

export type AuthMessageCode = (typeof AUTH_MESSAGE_CODES)[keyof typeof AUTH_MESSAGE_CODES];

export class AuthValidationError extends Error {
  public readonly code: AuthMessageCode;

  constructor(code: AuthMessageCode) {
    super(code);
    this.name = "AuthValidationError";
    this.code = code;
  }
}

export class AuthConflictError extends Error {
  public readonly code: AuthMessageCode;

  constructor(code: AuthMessageCode) {
    super(code);
    this.name = "AuthConflictError";
    this.code = code;
  }
}

export class AuthInvalidCredentialsError extends Error {
  public readonly code: AuthMessageCode;

  constructor(code: AuthMessageCode) {
    super(code);
    this.name = "AuthInvalidCredentialsError";
    this.code = code;
  }
}
