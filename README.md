# Mail Tune - Email Tone Assistant

Mail Tune is a browser extension that uses AI to rewrite emails in different tones while maintaining GDPR compliance.

## 🎯 Features

- **Tone Transformation**: Transform emails to various tones (professional, friendly, assertive, etc.)
- **GDPR Compliant**: No email content is stored on servers
- **Freemium Model**: Free tier with limited usage, paid tiers for more transformations
- **Social Login**: Authentication via Google, Facebook, and other providers
- **Usage Tracking**: Track number of transformations without storing email content

## ⚙️ Tech Stack

- **Backend**: Django, Django REST Framework
- **Authentication**: Supabase JWT
- **Database**: PostgreSQL (via Supabase)
- **AI Service**: OpenAI API
- **Frontend**: TailwindCSS
- **Caching**: Redis (optional)

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

## 📊 Usage Tiers

- **Free**: 10 email transformations per month
- **Starter**: 100 transformations per month ($9/month)
- **Premium**: 500 transformations per month ($19/month)
- **Business**: 1500 transformations per month ($49/month)

## 🔐 Data Privacy & GDPR Compliance

We take privacy seriously. Email content is never stored on our servers. Only the following metadata is stored:

- User ID
- Auth provider (e.g., Google)
- Number of emails transformed
- Usage timestamps
- Subscription status
- Billing cycle

## 🧠 API Usage

Example request:

```json
POST /api/transform-email/
{
  "user_inputed_original_email": "Can we move the meeting?",
  "tone": "Professional",
  "context": "Workplace",
  "intent": "Request",
  "intensity": "3",
  "token": "user_supabase_jwt"
}
```

Example response:

```json
{
  "transformed_text": "Would it be possible to reschedule our meeting at your convenience?",
  "remaining_transforms": 95
}
```

## 📱 Browser Extension

The browser extension is available for:
- Chrome
- Brave
- Firefox

Users must be logged into their Mail Tune account to use the extension.

## 🔧 Development Workflow

### Frontend Development

This project uses Tailwind CSS for styling:

1. For development with auto-rebuild:
```bash
npm run watch:css
```

2. This will compile the Tailwind CSS source files from `static/css/src/input.css` to `static/css/dist/output.css`.

3. To modify the Tailwind configuration, edit the `tailwind.config.js` file.

### Backend Development

1. Create a new branch for each feature:
```bash
git checkout -b feature/your-feature-name
```

2. Run the tests before committing:
```bash
python manage.py test
```

3. Format your code with Black:
```bash
black .
```

## 🛠️ Troubleshooting

### Common Issues

1. **TemplateDoesNotExist Error**
   - Make sure template files are in the correct location
   - Check that template paths in views match the actual file names
   - The custom auth decorator converts view names to template paths

2. **Authentication Issues**
   - Check if localStorage has valid mailtune_token and mailtune_user values
   - Verify Supabase connection settings

3. **Static Files Not Loading**
   - Run `python manage.py collectstatic`
   - Check that STATIC_URL and STATIC_ROOT are configured properly

### Deployment Checklist

- [ ] Set DEBUG=False in production
- [ ] Configure proper ALLOWED_HOSTS
- [ ] Set up HTTPS with proper SSL certificates
- [ ] Collect static files
- [ ] Set up a production database
- [ ] Configure CSRF and session security settings

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.
