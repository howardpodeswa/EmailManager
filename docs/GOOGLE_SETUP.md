# Google Cloud setup

EmailManager signs you in with Google and reads your Gmail through the Gmail API. Google needs to know about the app
first. You do this once, in the Google Cloud Console, and it takes about 10 minutes.

Do the setup while signed in to Google with an account you're happy to own the Cloud project (it doesn't have to be the
account you'll test with). Use **the QA account** for signing in to EmailManager, never your personal account (D13).

> **No free trial or billing needed.** Creating a project, enabling the Gmail API and setting up OAuth are free, and
> the Gmail API has no usage charge. If the console shows a "Start free trial" or "Activate" banner, or asks you to add
> a billing account, you can dismiss it.

> Google renames these console pages from time to time. If a menu name below doesn't match exactly, look for the closest
> one. In newer consoles, the OAuth pages live under **Google Auth Platform** (Branding, Audience, Clients, Data
> Access); in older ones, under **APIs & Services → OAuth consent screen** and **Credentials**.

## 1. Create a project

1. Open <https://console.cloud.google.com/>.
2. In the project picker at the top, choose **New project**.
3. Name it `EmailManager` (any name works) and click **Create**.
4. Make sure the new project is selected in the project picker before continuing.

## 2. Enable the Gmail API

1. Go to **APIs & Services → Library**.
2. Search for **Gmail API**, open it and click **Enable**.

## 3. Configure the OAuth consent screen (Testing mode)

1. Go to **Google Auth Platform → Branding** (older consoles: **APIs & Services → OAuth consent screen**). If asked to
   get started, click **Get started**.
2. **App name:** `EmailManager`. **User support email:** your address. Click **Next**.
3. **Audience:** choose **External**. Click **Next**.
4. **Contact information:** your address. Click **Next**, agree to the policy, and click **Create**.
5. Go to **Audience** and check that **Publishing status** is **Testing**. Leave it in Testing: the app is for local
   use only, and Testing mode doesn't need Google's verification review.
6. Under **Test users**, click **Add users**, enter **the QA account's address**, and save. Only listed test users can
   sign in while the app is in Testing mode.

## 4. Add the Gmail permission (scope)

1. Go to **Data Access** (older consoles: the **Scopes** step of the consent screen).
2. Click **Add or remove scopes** and add:
   - `openid`
   - `.../auth/userinfo.email` (shown as "See your primary Google Account email address")
   - `https://www.googleapis.com/auth/gmail.modify` (search for `gmail.modify`)
3. Click **Update**, then **Save**.

`gmail.modify` lets the app read, label, star, archive and draft. Milestone 1 only reads. The app never deletes email
permanently and only sends a reply after you click **Approve & send** (D9, D10).

## 5. Create the OAuth client

1. Go to **Clients** (older consoles: **APIs & Services → Credentials → Create credentials → OAuth client ID**).
2. Click **Create client**.
3. **Application type:** **Web application**. **Name:** `EmailManager local`.
4. **Authorized JavaScript origins:** you can leave this empty.
5. **Authorized redirect URIs:** click **Add URI** and enter exactly:

   ```
   http://localhost:3601/emailmanager-core/auth/google/callback
   ```

6. Click **Create**. Copy the **Client ID** and **Client secret** (you can also download the JSON). Keep the secret
   private: don't paste it into chat, email or the repo.

## 6. Put the values in `.env`

From the repo root:

```bash
cp .env.example .env
openssl rand -base64 32
```

Open `.env` in an editor and fill in:

```
GOOGLE_CLIENT_ID=<the Client ID from step 5>
GOOGLE_CLIENT_SECRET=<the Client secret from step 5>
TOKEN_ENCRYPTION_KEY=<the output of openssl rand -base64 32>
QA_ACCOUNT_EMAIL=<the QA account's address>
```

Or let a script fill in the two Google values for you (it asks for the Client ID, then the secret, which isn't shown as
you paste it):

```bash
./tools/scripts/set_google_credentials.sh
```

`.env` is gitignored, so these never reach GitHub. If you ever change `TOKEN_ENCRYPTION_KEY`, stored Google tokens can
no longer be decrypted and you'll need to sign in again.

## 7. Sign in

Start the app (see the [README](../README.md)), open <http://localhost:5180>, click **Sign in with Google**, and choose
**the QA account**. Google will warn that the app isn't verified: click **Continue** (this is expected in Testing mode).
Tick the box that allows EmailManager to read and organize your Gmail, then continue. You'll land on the Inbox.

## Troubleshooting

| What you see                                                                     | What to do                                                                                            |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `Error 400: redirect_uri_mismatch`                                               | The redirect URI in step 5 must match exactly, including `http`, port `3601` and the path.            |
| `Error 403: access_denied` / "has not completed the Google verification process" | Add the account you're signing in with as a test user (step 3.6).                                     |
| "Your Google sign-in has expired. Please sign in again."                         | Normal: in Testing mode Google expires the sign-in after 7 days. Click **Sign in with Google again**. |
| The app says it needs permission to read your Gmail                              | On Google's consent page, tick the Gmail checkbox before continuing.                                  |
| The backend refuses to start and lists missing settings                          | Fill in the values it names in `.env` (step 6).                                                       |
