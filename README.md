# Chrome Hearts Serverless Monitor (Chrome Hearts 监控系统)

A 100% serverless, zero-cost monitoring system designed to detect new arrivals, online drops, and menu navigation changes on the official Chrome Hearts website (`chromehearts.com`).

This project runs periodically on a schedule using **GitHub Actions** and hosts a visually premium dark gothic dashboard on **GitHub Pages** to showcase detected products and update logs. When a new item is detected, it sends instant email alerts.

---

## 🛠️ Step-by-Step Deployment Instructions

### 1. Create and Push to a GitHub Repository
1. Log in to GitHub and create a new **Public** repository (e.g., `chromehearts-monitor`).
2. Do **not** initialize it with a README or `.gitignore`.
3. Open your terminal in this project directory (`d:/Project/chromehearts-monitor`) and push the codebase to your new repository:
   ```bash
   git init
   git add .
   git commit -m "initial commit: serverless chrome hearts monitor"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
   *(Replace `<your-username>` and `<your-repo-name>` with your actual GitHub username and repository name).*

---

### 2. Configure Workflow Permissions (Critical!)
GitHub Actions needs permissions to write back the updated `docs/data/products.json` file to your repository.
1. Go to your GitHub repository and click on **Settings** (tab at the top).
2. On the left sidebar, click on **Actions** -> **General**.
3. Scroll down to the bottom section called **Workflow permissions**.
4. Change the selection to **Read and write permissions**.
5. Click **Save**.

---

### 3. Setup GitHub Actions Repository Secrets
Sensitive credentials are kept secure in GitHub Secrets so they never show up in your public source code.
1. Go to your GitHub repository and click on **Settings**.
2. On the left sidebar, click on **Secrets and variables** -> **Actions**.
3. Under **Repository secrets**, click **New repository secret** for each of the following:

| Secret Name | Description / Example |
| :--- | :--- |
| `SMTP_HOST` | The SMTP server host address (e.g., `smtp.gmail.com` or `smtp.qq.com`) |
| `SMTP_PORT` | The SMTP server port (usually `587` for TLS or `465` for SSL) |
| `SMTP_USER` | Your email address used to authenticate (e.g., `myemail@gmail.com`) |
| `SMTP_PASS` | Your email app password / authentication code (e.g., Gmail App Password) |
| `EMAIL_FROM` | The sender address displayed in the email (e.g., `Chrome Hearts Monitor <myemail@gmail.com>`) |
| `EMAIL_TO` | The recipient email address where alerts will be sent (e.g., `myalerts@gmail.com`) |

*Note: For Gmail, you **must** use an **App Password** instead of your regular password. Enable 2-Factor Authentication in Google Account settings, go to Security, and search for "App Passwords" to generate one.*

---

### 4. Enable GitHub Pages Dashboard
Host your beautiful dashboard for free.
1. Go to your GitHub repository and click on **Settings**.
2. On the left sidebar, click on **Pages**.
3. Under **Build and deployment** -> **Source**, select **Deploy from a branch**.
4. Under **Branch**:
   - Select **`main`** (or your default branch) from the first dropdown.
   - Select **`/docs`** (instead of `/ (root)`) from the folder dropdown.
5. Click **Save**.
6. After about 1-2 minutes, your dashboard will be live at:
   `https://<your-username>.github.io/<your-repo-name>/`

---

## ⚡ How to Trigger Manual Checks
By default, the monitor runs automatically every **10 minutes** using GitHub Actions' scheduler. You can also trigger it manually at any time (e.g., during rumored drop hours):
1. Go to your GitHub repository page and click on the **Actions** tab at the top.
2. In the left sidebar under workflows, click on **Chrome Hearts Monitor**.
3. Click on the **Run workflow** dropdown button on the right.
4. Select the branch and click the green **Run workflow** button.
5. In a few seconds, the workflow will spin up, execute the check, send email alerts if anything has changed, and commit the database file. Your GitHub Pages site will update automatically!

---

## 📂 Project Structure
- `monitor.js`: Scraper and email notification engine written in Node.js.
- `.github/workflows/monitor.yml`: Automated scheduled actions workflow.
- `docs/index.html`: Dashboard template styled with Chrome Hearts dark luxury aesthetics.
- `docs/style.css`: Glassmorphic styling and smooth animations.
- `docs/main.js`: Dashboard script to read the state JSON and update UI components.
- `docs/data/products.json`: Product database state file.
