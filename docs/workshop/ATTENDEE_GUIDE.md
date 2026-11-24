# EmailManager workshop: attendee guide

In this workshop you build your own working version of **EmailManager**, an app that helps sort your email, from a
business requirements document. You won't write code: Claude does the technical work while you make the business
decisions.

By the end of session 1 you'll have the app running on your Mac with a demo mailbox. Session 2 (optional) adds your
business rules.

**What you need:** a Mac (macOS 13 or newer, at least 8 GB memory and 15 GB free space), an internet connection, and
about 45 minutes for the steps below **before the day**. Please don't leave them for the morning of the workshop:
some downloads are large.

---

## Before the workshop

### 1. Accept your Claude invitation

You'll receive an email inviting you to the workshop's Claude team. Open it and accept the invitation. There's
nothing to pay. Use the same email address in step 2.

### 2. Install the Claude app and sign in

1. Download the Claude app for Mac from <https://claude.com/download> and drag it into **Applications**.
2. Open it and sign in with the email address from your invitation.
3. If it asks which organization to use, choose the workshop team.

### 3. Install Docker Desktop

Docker Desktop is a free program that stores your app's data on your Mac.

1. Go to <https://www.docker.com/products/docker-desktop/> and download **Docker Desktop for Mac**. Pick **Apple
   chip** or **Intel chip** to match your Mac (Apple menu → About This Mac → "Chip").
2. Open the downloaded file and drag **Docker** into **Applications**.
3. Open Docker from Applications. Accept its terms. If it asks for your Mac password to finish setting up, type it.
   You can skip any sign-in or survey screens.
4. Wait until Docker says it's running (a whale icon appears at the top of your screen).

### 4. Run the readiness check (one paste)

This checks your Mac and installs the free developer tools Claude will need. It doesn't need your password and only
changes things inside your own home folder.

1. Open **Terminal**: press **Command + Space**, type `Terminal`, and press **Enter**.
2. Copy this whole line, paste it into Terminal and press **Enter**:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/howardpodeswa/EmailManager/main/docs/workshop/check_mac.sh | bash
   ```

3. Wait for it to finish (2–10 minutes). The end of the output shows one of two results:
   - **"Your Mac is ready for the workshop."** You're done.
   - **Items marked ✘.** Follow the instruction next to each one, then paste the same line again. A common one: a
     window asks to install Apple's "Command Line Tools". Click **Install**, wait, then run the check again.

If you're stuck, send a screenshot of the Terminal window to the facilitator.

### 5. Have your requirements ready

Put your business requirements document in the **Workshop** folder in your home folder (the readiness check created
it). Any common format works: Word, PDF or text. It can be your own version of the EmailManager requirements, or the
example the facilitator sends you.

### 6. Optional, for later: a spare Gmail account

If you'd like to connect real email after the workshop, create a separate Gmail account just for testing. **Never use
your personal or work email** for this. You won't need it on the day.

---

## On the day

### Start your project

1. Open the **Claude** app.
2. Switch to the **Code** tab at the top of the window.<sup>†</sup>
3. Choose the **Workshop** folder in your home folder as the folder to work in.<sup>†</sup>
4. Click into the message box at the bottom, paste this sentence, and replace `<your file>` with your requirements
   file's name (for example `MyRequirements.docx`):

   > Workshop: read https://raw.githubusercontent.com/howardpodeswa/EmailManager/main/docs/workshop/WORKSHOP_START.md
   > and build an application from my requirements in ~/Workshop/<your file>

5. Press **Enter**.

### While Claude works

- **Permission requests:** Claude asks before running things on your Mac. Choose **Allow**. If you're offered an
  option to always allow for this folder, choose it, so you're asked less often.<sup>†</sup>
- **Your Mac password:** type it only when **macOS itself** asks (a grey system window). Never type it into the chat.
- **Questions:** Claude asks two questions at the start (your app's name and which file to use), then shows a short
  summary at each checkpoint. Read it and reply **OK**, or ask about anything that doesn't look right.
- **Waiting:** some steps take a few minutes. Claude tells you what it's doing. You don't need to type anything.

### What you'll see

1. Claude checks your Mac and loads the workshop instructions.
2. It asks for your app's name (suggestion: `EmailManager_` plus your initials) and confirms your requirements file.
3. It summarizes your requirements in a few bullets and may ask up to 5 questions, each with a suggested answer.
4. It shows what today's session will build and asks "OK to build?".
5. It builds the app and runs its automated checks. This is the longest part: up to about an hour.
6. Your browser opens your app. Click **Try with the demo mailbox** to see your Inbox, full of made-up emails.

### After the session

In Finder, open **Workshop**, then your app's folder:

- Double-click **Start <your app>** to open your app again. It starts everything and opens your browser.
- Double-click **Stop <your app>** when you're done.

The first time, macOS may say it can't open the file. Right-click it, choose **Open**, then **Open** again.

---

## Stuck?

| What you see                                                     | What to do                                                                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Claude says Docker isn't running                                 | Open **Docker** from Applications and wait until it says it's running. Then tell Claude "Docker is running". |
| A window asks to install "Command Line Tools"                    | Click **Install** and wait for it to finish, then tell Claude "done".                                        |
| Claude asks for permission again and again                       | Choose the "always allow" option if offered. Otherwise keep choosing **Allow**: it's normal.                 |
| You typed something by mistake                                   | Nothing breaks. Tell Claude what happened in plain words.                                                    |
| A step has been running for more than 10 minutes with no message | Ask Claude "how is it going?". If it's stuck, raise your hand.                                               |
| Your Mac went to sleep, or Claude says it lost the connection    | Wake the Mac and tell Claude "continue".                                                                     |
| The app page says it can't connect                               | Double-click **Start <your app>** in your project folder.                                                    |

<sup>†</sup> Button and menu names in the Claude app may differ slightly between versions. The facilitator confirms
them before the workshop.
