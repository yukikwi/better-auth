import { Google } from "arctic";
import { parseJWT } from "oslo/jwt";
import type { OAuthProvider, ProviderOptions } from ".";
import { BetterAuthError } from "../error/better-auth-error";
import { logger } from "../utils/logger";
import { createOAuth2Request, sendTokenRequest } from "arctic/dist/request";
import { getRedirectURI, validateAuthorizationCode } from "./utils";

export interface GoogleProfile {
	aud: string;
	azp: string;
	email: string;
	email_verified: boolean;
	exp: number;
	/**
	 * The family name of the user, or last name in most
	 * Western languages.
	 */
	family_name: string;
	/*s*
	 * The given name of the user, or first name in most
	 * Western languages.
	 */
	given_name: string;
	hd?: string;
	iat: number;
	iss: string;
	jti?: string;
	locale?: string;
	name: string;
	nbf?: number;
	picture: string;
	sub: string;
}

export interface GoogleOptions extends ProviderOptions {}

export const google = (options: GoogleOptions) => {
	const googleArctic = new Google(
		options.clientId,
		options.clientSecret,
		getRedirectURI("google", options.redirectURI),
	);
	return {
		id: "google",
		name: "Google",
		createAuthorizationURL({ state, scopes, codeVerifier, redirectURI }) {
			redirectURI;
			if (!options.clientId || !options.clientSecret) {
				logger.error(
					"clientId and clientSecret is required for Google. Make sure to you have provided them in the options",
				);
				throw new BetterAuthError("clientId is required for Google");
			}
			if (!codeVerifier) {
				throw new BetterAuthError("codeVerifier is required for Google");
			}
			const _scopes = scopes || ["email", "profile"];
			return googleArctic.createAuthorizationURL(state, codeVerifier, _scopes);
		},
		validateAuthorizationCode: async (code, codeVerifier, redirectURI) => {
			return validateAuthorizationCode({
				code,
				codeVerifier,
				redirectURI:
					redirectURI || getRedirectURI("google", options.redirectURI),
				options,
				tokenEndpoint: "https://oauth2.googleapis.com/token",
			});
		},
		async getUserInfo(token) {
			if (!token.idToken) {
				return null;
			}
			const user = parseJWT(token.idToken())?.payload as GoogleProfile;
			return {
				user: {
					id: user.sub,
					name: user.name,
					email: user.email,
					image: user.picture,
					emailVerified: user.email_verified,
				},
				data: user,
			};
		},
	} satisfies OAuthProvider<GoogleProfile>;
};
