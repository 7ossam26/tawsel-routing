package com.tawsel;

import org.keycloak.authentication.AuthenticationFlowContext;
import org.keycloak.authentication.authenticators.resetcred.ResetCredentialChooseUser;
import org.keycloak.authentication.authenticators.browser.AbstractUsernameFormAuthenticator;
import org.keycloak.models.UserModel;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;

/** Only installed in the personal reset-credentials flow. The normal browser
 * login still has loginWithEmailAllowed=false. Subsequent built-in executions
 * issue/verify the short-lived email action and change the password. */
public final class VerifiedEmailRecovery extends ResetCredentialChooseUser {
    private String digest(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
    private boolean allowed(AuthenticationFlowContext context, String email) {
        String prefix = "tawsel-recovery:" + context.getRealm().getId() + ":";
        String ip = digest(context.getConnection().getRemoteAddr());
        long minute = System.currentTimeMillis() / 60000;
        boolean slot = false;
        for (int n = 0; n < 10; n++) {
            if (context.getSession().singleUseObjects().putIfAbsent(prefix + ip + ":" + minute + ":" + n, 120)) { slot = true; break; }
        }
        return slot && context.getSession().singleUseObjects().putIfAbsent(prefix + "email:" + digest(email.toLowerCase(Locale.ROOT)), 60);
    }
    @Override public String getId() { return "tawsel-verified-email-recovery"; }
    @Override public String getDisplayType() { return "Tawsel verified recovery email"; }
    @Override public String getHelpText() { return "Select an enabled account by verified recovery email only; neutral failure continues through the standard email flow."; }
    @Override public void authenticate(AuthenticationFlowContext context) {
        // Never silently choose an existing SSO account instead of the supplied email.
        context.clearUser();
        context.challenge(context.form().createPasswordReset());
    }
    @Override public void action(AuthenticationFlowContext context) {
        String supplied = context.getHttpRequest().getDecodedFormParameters().getFirst("username");
        String email = supplied == null ? "" : supplied.trim();
        UserModel user = null;
        if (email.length() <= 254 && email.contains("@") && allowed(context, email)) {
            user = context.getSession().users().getUserByEmail(context.getRealm(), email);
        }
        context.getAuthenticationSession().setAuthNote(AbstractUsernameFormAuthenticator.ATTEMPTED_USERNAME, email);
        if (user != null && user.isEnabled() && user.isEmailVerified()) {
            context.setUser(user);
            context.getAuthenticationSession().setAuthNote(RESET_CREDENTIAL_USER_CHOSEN, "true");
        } else {
            context.clearUser();
        }
        context.success();
    }
}
