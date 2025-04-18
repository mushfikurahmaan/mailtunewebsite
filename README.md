# Mail Tune - Email Tone Assistant

Mail Tune is a browser extension that uses AI to rewrite emails in different tones while maintaining GDPR compliance.

## 🎯 Features

- **Tone Transformation**: Transform emails to various tones (professional, friendly, assertive, etc.)
- **GDPR Compliant**: No email content is stored on servers
- **Freemium Model**: Free tier with limited usage, paid tiers for more transformations
- **Social Login**: Authentication via Google, Facebook, and other providers
- **Usage Tracking**: Track number of transformations without storing email content
- **Context Awareness**: Adapt tone based on email context and intent
- **Adjustable Intensity**: Control the level of tone transformation needed

## 📁 Project Structure

```
mail_tune_project/
├── accounts/                 # User authentication and profile management
│   ├── decorators.py         # Custom auth decorators
│   ├── middleware.py         # Supabase JWT auth middleware
│   ├── models.py             # UserProfile, Subscription, UsageLog models
│   ├── urls.py               # Account-related URLs
│   └── views.py              # Auth and profile views
├── ai_service/               # AI integration services
│   ├── services.py           # OpenAI API integration for email transformation
│   └── models.py             # AI service models
├── api/                      # REST API endpoints
│   ├── urls.py               # API endpoint routes
│   └── views.py              # API views for email transformation
├── mail_tune_project/        # Project configuration
│   ├── settings.py           # Django settings
│   ├── urls.py               # Main URL routing
│   ├── asgi.py               # ASGI configuration
│   └── wsgi.py               # WSGI configuration
├── static/                   # Static files (CSS, JS, etc.)
│   ├── css/                  # Stylesheets
│   │   ├── src/              # Source CSS files
│   │   └── dist/             # Compiled CSS files
│   └── js/                   # JavaScript files
├── templates/                # HTML templates
│   ├── accounts/             # Account-related templates
│   ├── registration/         # Registration templates
│   └── home.html             # Main application template
├── manage.py                 # Django management script
├── requirements.txt          # Python dependencies
├── package.json              # Node.js dependencies
├── tailwind.config.js        # Tailwind CSS configuration
└── postcss.config.js         # PostCSS configuration
```

## ⚙️ Technology Stack

### Backend
- **Framework**: Django 5.x with Django REST Framework
- **Authentication**: Supabase JWT for secure token-based auth
- **Database**: 
  - Development: SQLite
  - Production: PostgreSQL (via Supabase)
- **Caching**: Redis for performance optimization
- **AI Integration**: OpenAI GPT-4 API

### Frontend
- **Styling**: TailwindCSS for responsive design
- **Build System**: PostCSS for processing CSS
- **JavaScript**: Vanilla JS for browser extension

### Infrastructure
- **Deployment**: Configurable for various hosting providers
- **Static Files**: Configured with whitenoise for production
- **Security**: CSRF protection, secure cookies, HTTPS enforcement

## 💾 Data Models

### UserProfile
- Tracks user authentication data
- Stores subscription tier and usage statistics
- GDPR compliant with minimal personal data retention

### Subscription
- Manages paid subscription details
- Tracks subscription status, renewal dates, and payment information

### UsageLog
- Records transformation usage without storing email content
- Tracks word count and tone selection for analytics

## 🚀 Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/mail-tune.git
   cd mail-tune
   ```

2. Create a virtual environment and install dependencies:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Install frontend dependencies:
   ```
   npm install
   ```

4. Build the CSS:
   ```
   npm run build:css
   ```

5. Set up environment variables (create a `.env` file in the project root):
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   OPENAI_API_KEY=your_openai_api_key
   SECRET_KEY=your_django_secret_key
   DEBUG=True  # Set to False in production
   ```

6. Run migrations:
   ```
   python manage.py migrate
   ```

7. Start the development server:
   ```
   python manage.py runserver
   ```

## 🚪 Deployment on Render

This application is configured for easy deployment on Render.com:

1. Fork or clone this repository to your own GitHub account.

2. Create a Render account and connect it to your GitHub account.

3. Create a new Web Service on Render and select your repository.

4. Render will automatically detect the `render.yaml` configuration, which includes:
   - Web service configuration
   - PostgreSQL database
   - Redis cache

5. Set up the environment variables in Render dashboard:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `SUPABASE_URL`: Your Supabase project URL (format: https://your-project-id.supabase.co)
   - `SUPABASE_KEY`: Your Supabase anon/public key (NOT the secret key)
   - `SECRET_KEY`: A secure Django secret key (auto-generated by Render)
   - Other email-related variables if needed

6. Ensure your Supabase settings are correctly configured:
   - Make sure your Supabase project allows authentication from your Render domain
   - Configure the OAuth providers (Google, Facebook, etc.) in your Supabase dashboard
   - Add your Render domain to the allowed redirect URLs in Supabase

7. Click "Create Web Service" and Render will handle the deployment process:
   - Installing dependencies
   - Running migrations
   - Collecting static files
   - Starting the application

8. After deployment, your application will be available at `https://your-app-name.onrender.com`

## 📊 Usage Tiers

The application supports multiple subscription tiers with different usage limits:

| Tier | Email Transforms | Word Limit | Price |
|------|------------------|------------|-------|
| Free | 5 (lifetime) | 1,000 | $0 |
| Starter | 100/month | 10,000/month | $9/month |
| Premium | 500/month | 50,000/month | $19/month |
| Business | 1,500/month | 600,000/month | $49/month |

## 🔐 Authentication Flow

1. User authenticates through the frontend using Supabase auth providers
2. Supabase issues a JWT token upon successful authentication
3. Backend validates the JWT token via the SupabaseJWTMiddleware
4. UserProfile is created or retrieved based on the authenticated user ID
5. All API requests include the JWT token for authentication

## 🔧 API Endpoints

### Transform Email
```
POST /api/transform-email/
```

Request:
```json
{
  "user_inputed_original_email": "Can we move the meeting?",
  "tone": "Professional",
  "context": "Workplace",
  "intent": "Request",
  "intensity": "3",
  "token": "user_supabase_jwt"
}
```

Response:
```json
{
  "transformed_text": "Would it be possible to reschedule our meeting at your convenience?",
  "remaining_transforms": 95
}
```

### Get Usage Statistics
```
GET /api/get-user-usage/
```

Response:
```json
{
  "subscription_tier": "STARTER",
  "total_emails_transformed": 25,
  "total_words_transformed": 2500,
  "email_limit": 100,
  "words_limit": 10000,
  "renewal_date": "June 15, 2023",
  "days_until_renewal": 7
}
```

## 🔒 GDPR Compliance Architecture

The application is designed with privacy by design principles:

1. **No Email Storage**: Email content is never stored on servers
2. **Minimal Data Collection**: Only usage metadata is retained
3. **Secure Processing**: All transformations happen in-memory
4. **Encryption**: All API calls use HTTPS
5. **User Control**: Users can delete their accounts and data
6. **Transparent Processing**: Clear documentation on data handling

## 🧪 Testing & Development

### Running Tests
```bash
python manage.py test
```

### Frontend Development
```bash
# Watch for CSS changes
npm run watch:css
```

### Backend Development
```bash
# Create a new branch for features
git checkout -b feature/your-feature-name

# Format code before committing
black .
```

## 🚢 Deployment

### Production Checklist
- [ ] Set `DEBUG=False` in settings
- [ ] Configure proper `ALLOWED_HOSTS`
- [ ] Set up HTTPS with valid SSL certificates
- [ ] Run `python manage.py collectstatic`
- [ ] Configure production database (PostgreSQL recommended)
- [ ] Set up proper Redis cache for production
- [ ] Update `SECRET_KEY` to a strong random value
- [ ] Configure proper email settings for notifications
- [ ] Set up monitoring and error tracking

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

