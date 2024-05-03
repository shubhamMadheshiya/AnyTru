# RESTful API Node Express Mongoose Example

The project builds RESTful APIs of AnyTru using Node.js, Express and Mongoose, ...

## Manual Installation

Clone the repo:

```bash
git clone https://github.com/shubhamMadheshiya/AnyTru.git
cd api
```

Install the dependencies:

```bash
npm install
```

Set the environment variables:

```bash
cp .env.example .env
# open .env and modify the environment variables
```


## Table of Contents

- [Commands](#commands)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)

## Commands

Running in development:

```bash
npm start
# or
npm run dev
```
<!-- 
Running in production:

```bash
# build
npm run build
# start
npm run prod
``` -->

## Environment Variables

The environment variables can be found and modified in the `.env` file.

```bash



# Port
PORT = # default 6000

# URL of the Mongo DB
DATABASE_URI = mongodb://127.0.0.1:27017/database_name

# JWT
JWT_ACCESS_TOKEN_SECRET_PRIVATE =
JWT_ACCESS_TOKEN_SECRET_PUBLIC =
JWT_ACCESS_TOKEN_EXPIRATION_MINUTES = # default 240 minutes

# Token expires
REFRESH_TOKEN_EXPIRATION_DAYS = # default 1 day
VERIFY_EMAIL_TOKEN_EXPIRATION_MINUTES = # default 60 minutes
RESET_PASSWORD_TOKEN_EXPIRATION_MINUTES = # default 30 minutes

# SMTP configuration
SMTP_HOST = smtp.googlemail.com
SMTP_PORT = 465
SMTP_USERNAME =
SMTP_PASSWORD =
EMAIL_FROM =

# DOMAIN frontend
CLIENT_DOMAIN = 
ADMIN_DOMAIN = 

# URL images
IMAGE_URL = # default http://localhost:666/images
```

## Project Structure

```
public\             # Public folder
 |--css             # Static style
src\
 |--config\         # Environment variables and configuration
 |--controllers\    # Controllers
 |--middlewares\    # Custom express middlewares
 |--models\         # Mongoose models
 |--routes\         # Routes
 |--services\       # Business logic
 |--utils\          # Utility classes and functions contains static html
 |--validations\    # Request data validation schemas
views\              # Static view folder
 |--index.html      # Static html
server.js           # App entry point
 |
swagger.js          # create swagger doc output
```

### API Endpoints

List of available routes:
**Root routes**:\
`GET /` - Root Page\

<!-- 
**Auth routes**:\
`POST api/v1/auth/signup` - Signup\
`POST api/v1/auth/signin` - Signin\
`POST api/v1/auth/logout` - Logout\
`POST api/v1/auth/refresh-tokens` - Refresh auth tokens\
`POST api/v1/auth/forgot-password` - Send reset password email\
`POST api/v1/auth/reset-password` - Reset password\
`POST api/v1/auth/send-verification-email` - Send verification email\
`POST api/v1/auth/verify-email` - Verify email\
`POST api/v1/auth/me` - Profile\
`PUT api/v1/auth/me` - Update profile

**User routes**:\
`POST api/v1/users` - Create a user\
`GET api/v1/users` - Get all users\
`GET api/v1/users/:userId` - Get user\
`PUT api/v1/users/:userId` - Update user\
`DELETE api/v1/users/:userId` - Delete user

**Role routes**:\
`POST api/v1/roles` - Create a role\
`GET api/v1/roles` - Get all roles\
`GET api/v1/roles/:userId` - Get role\
`PUT api/v1/roles/:userId` - Update role\
`DELETE api/v1/roles/:userId` - Delete role

**Image routes**:\
`POST api/v1/images/upload` - Upload image -->

<!-- ## License

[MIT](LICENSE) -->