# Purchase Request Dashboard (HTML, CSS, JavaScript + MongoDB Atlas)

This project matches the two-dashboard sketch:
- **Dashboard 1:** choose department and ranking, add material line items, calculate totals, save as Draft or submit as Pending.
- **Dashboard 2:** view requests saved in MongoDB, filter by status, and Accept or Reject pending requests.
- Request numbers begin at `10001` and increment from the highest existing PR number.
- The browser talks to an Express API; MongoDB credentials stay on the server.

## Requirements
Install Node.js LTS from https://nodejs.org/ and create a free MongoDB Atlas deployment at https://www.mongodb.com/cloud/atlas/register.

## Setup
1. Extract this project folder and open it in VS Code.
2. Open a terminal in this folder and run:
   ```bash
   npm install
   ```
3. In MongoDB Atlas:
   - Create a database user.
   - Add your current IP address under Network Access.
   - Select your deployment's **Connect → Drivers → Node.js** and copy the connection string.
4. Copy `.env.example` and name the copy `.env`.
   - Paste your Atlas connection string after `MONGODB_URI=`.
   - Replace username, password and cluster host with your actual values.
   - If the password contains characters such as `@`, `:`, `/`, `?`, `#` or `%`, URL-encode those characters.
5. Start the application:
   ```bash
   npm start
   ```
6. Open http://localhost:3000 in your browser.

The database `purchase_request_db` and collection `purchaserequests` are created automatically when the first request is saved.

## Important notes
- Never put the MongoDB URI or database password in `public/app.js` or any browser-side file.
- Do not commit `.env` to GitHub.
- This is a learning/demo workflow and has no login or role-based access control. Anyone who can reach the app can currently accept or reject requests. Add authentication and authorization before deploying for real use.
- PR number generation is suitable for a small practice project; a production multi-user system should use an atomic counter to prevent duplicate numbers during simultaneous submissions.
