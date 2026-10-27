# MongoDB Atlas database setup for Purchase Request Dashboard

This project is already wired to MongoDB through Express + Mongoose. You only need to provide your own MongoDB Atlas connection string in `.env`; credentials cannot be prefilled because they belong to your Atlas account.

## Database structure

- Database: `purchase_request_db`
- Collection: `purchaserequests` (Mongoose creates it when the first request is saved)
- One collection is sufficient for the current app. Materials are embedded as an array inside each purchase request document; separate SQL-style tables are not needed.

### Purchase request document fields

- `prNo`: Number, required unique PR number entered by the user
- `department`: String
- `rankingBy`: String (free text)
- `materials`: array of embedded objects, each containing `description` (String), `unit` (String), `quantity` (Number), and `netPrice` (Number)
- `status`: `Draft`, `Pending`, `Accepted`, or `Rejected`
- `createdAt`, `updatedAt`: Dates
- `_id`: MongoDB document identifier (created automatically)

## Atlas setup

1. In Atlas, create a cluster/deployment.
2. Create a **database user** with read/write access for the application database.
3. Under Network Access, add your current public IP address.
4. Open the cluster's **Connect → Drivers → Node.js** screen and copy the connection string.
5. Copy `.env.example` to a file named `.env` in this project directory.
6. Set `MONGODB_URI` to your Atlas URI and include the database name `purchase_request_db` after `.net/`, before the `?` query string.
7. Run `npm install`, then `npm start`, and open `http://localhost:3000`.
8. Save the first purchase request, then open Atlas **Data Explorer** to view the database and collection.

Example format only (replace all placeholders with your actual Atlas values):

```dotenv
MONGODB_URI=mongodb+srv://YOUR_USERNAME:URL_ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/purchase_request_db?retryWrites=true&w=majority
PORT=3000
```

If your password contains reserved URL characters such as `@`, `#`, `%`, `/`, or `:`, URL-encode them in the URI. Never commit or share `.env`; it contains credentials. The `.gitignore` already excludes it.

## Application API ↔ database connections

- `GET /api/requests` — reads all purchase requests from `purchaserequests`
- `GET /api/requests/:id` — reads one request by MongoDB `_id`
- `POST /api/requests` — validates and inserts a request, including the user-entered numeric PR No.
- `PATCH /api/requests/:id/status` — updates a request status

The browser calls these API routes; only `server.js` connects to MongoDB. Do not put the MongoDB URI in any file under `public/`.
