# AnyTru

The project builds RESTful APIs of AnyTru using Node.js, Express and Mongoose, ...

## Languages & tools

- [Node](https://nodejs.org/en/)

- [Express](https://expressjs.com/)

- [Mongoose](https://mongoosejs.com/)

### Code Formatter

- Add a `.vscode` directory
- Create a file `settings.json` inside `.vscode`
- Install Prettier - Code formatter in VSCode
- Add the following snippet:

```json
{
	"editor.formatOnSave": true,
	"prettier.singleQuote": true,
	"prettier.arrowParens": "avoid",
	"prettier.jsxSingleQuote": true,
	"prettier.trailingComma": "none",
	"javascript.preferences.quoteStyle": "single"
}
```

## Manual Installation

Clone the repo:

```bash
git clone https://github.com/shubhamMadheshiya/AnyTru.git
# cd api
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



DATABASE_URI =
PORT = 5000

#MAILCHIMP DETAILS
MAILCHIMP_KEY=
MAILCHIMP_LIST_KEY=


#MAILGUN DETAILS
MAILGUN_KEY =
MAILGUN_DOMAIN=
MAILGUN_EMAIL_SENDER=


#JWT
JWT_SECRET=

#URL
CLIENT_URL=
ADMIN_URL =
BASE_API_URL=


#GOOGLE
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=


#FACEBOOK
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
FACEBOOK_CALLBACK_URL=

CLIENT_URL=http://localhost:3000


#AWS
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_BUCKET_NAME=

#RAZORPAY
RAZORPAY_KEY_ID=
RAZORPAY_SECRET_ACCESS_KEY=
```

## Project Structure

```
public\             # Public folder
 |--css             # Static style
src\
 |--config\         # Environment variables and configuration
 |--constant\       # contain constant
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

**Auth routes**:\
`POST auth/register` - Register User\
`POST auth/login` - Login\
`GET auth/google/callback` - Google auth\
`GET auth/facebook/callback` - Refresh auth tokens\
`POST auth/forgot` - Send reset password link at email\
`POST auth/reset/:token` - Reset password\
`POST auth/reset` - Reset password from old password\

<!--
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
`POST api/v1/images/upload` - Upload image --> -->

<!-- ## License

[MIT](LICENSE)
