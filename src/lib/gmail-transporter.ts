import nodemailer, { type Transporter } from "nodemailer";

const REQUIRED_GMAIL_ENV_VARS = [
  "GMAIL_USER",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
] as const;

const REQUIRED_PASSWORD_ENV_VARS = ["EMAIL_USER", "EMAIL_PASS"] as const;

let cachedTransporter: Transporter | null = null;
let cachedPasswordTransporter: Transporter | null = null;

function readEnv(key: string) {
  const value = process.env[key];
  return typeof value === "string" ? value.trim() : "";
}

export function getMissingGmailEnvVars() {
  return REQUIRED_GMAIL_ENV_VARS.filter((key) => !readEnv(key));
}

export function isGmailOauthConfigured() {
  return getMissingGmailEnvVars().length === 0;
}

export function getMissingPasswordEnvVars() {
  return REQUIRED_PASSWORD_ENV_VARS.filter((key) => !readEnv(key));
}

export function isEmailPasswordConfigured() {
  return getMissingPasswordEnvVars().length === 0;
}

export function getGmailSender() {
  return readEnv("GMAIL_USER") || readEnv("EMAIL_USER");
}

export function getPasswordEmailSender() {
  return readEnv("EMAIL_USER");
}

export function createGmailTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: getGmailSender(),
      clientId: readEnv("GOOGLE_CLIENT_ID"),
      clientSecret: readEnv("GOOGLE_CLIENT_SECRET"),
      refreshToken: readEnv("GOOGLE_REFRESH_TOKEN"),
    },
  });
}

export function createPasswordEmailTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: getPasswordEmailSender(),
      pass: readEnv("EMAIL_PASS"),
    },
  });
}

export function getGmailTransporter() {
  const missingEnvVars = getMissingGmailEnvVars();

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing Gmail OAuth environment variables: ${missingEnvVars.join(", ")}`,
    );
  }

  cachedTransporter ??= createGmailTransporter();
  return cachedTransporter;
}

export function getPasswordEmailTransporter() {
  const missingEnvVars = getMissingPasswordEnvVars();

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing password email environment variables: ${missingEnvVars.join(", ")}`,
    );
  }

  cachedPasswordTransporter ??= createPasswordEmailTransporter();
  return cachedPasswordTransporter;
}
