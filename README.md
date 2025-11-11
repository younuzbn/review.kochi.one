# Kochi One - NFC Card Service Website

A modern, responsive website for Kochi One, a leading NFC card service company. Built with Node.js, Express.js, and EJS templating.

## Features

- **Modern Design**: Clean, professional design with responsive layout
- **NFC Technology Focus**: Specialized content for NFC card services
- **Interactive Elements**: Animated NFC card demonstrations and smooth scrolling
- **Contact Form**: Functional contact form with validation
- **Mobile Responsive**: Optimized for all device sizes
- **SEO Friendly**: Clean HTML structure and meta tags

## Pages

- **Home**: Hero section with company overview and key features
- **About**: Company story, team, and values
- **Services**: Detailed service offerings (NFC cards, mobile payments, access control, marketing)
- **Contact**: Contact form and company information
- **404**: Custom error page

## Technology Stack

- **Backend**: Node.js, Express.js
- **Templating**: EJS with layouts
- **Styling**: Custom CSS with modern design patterns
- **Icons**: Font Awesome
- **Fonts**: Google Fonts (Inter)
- **JavaScript**: Vanilla JS for interactions

## Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd /Users/apple/Documents/YOUNUZBN/kochi.one
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   Or for production:
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## Project Structure

```
kochi.one/
├── app.js                 # Main server file
├── package.json          # Dependencies and scripts
├── README.md             # This file
├── views/                # EJS templates
│   ├── layouts/
│   │   └── main.ejs      # Main layout template
│   ├── index.ejs         # Homepage
│   ├── about.ejs         # About page
│   ├── services.ejs      # Services page
│   ├── contact.ejs       # Contact page
│   └── 404.ejs           # Error page
└── public/               # Static assets
    ├── css/
    │   └── style.css     # Main stylesheet
    ├── js/
    │   └── script.js     # JavaScript functionality
    ├── images/           # Image assets
    └── favicon.ico       # Site favicon
```

## Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with nodemon (auto-restart)

## Customization

### Adding New Pages

1. Create a new EJS template in the `views/` directory
2. Add a route in `app.js`
3. Update navigation in `views/layouts/main.ejs`

### Styling

- Main styles are in `public/css/style.css`
- Uses CSS Grid and Flexbox for layouts
- Responsive design with mobile-first approach
- Custom CSS variables for easy theming

### Content Updates

- Update company information in the respective EJS templates
- Modify contact information in `views/layouts/main.ejs` and `views/contact.ejs`
- Update service offerings in `views/services.ejs`

## Features in Detail

### NFC Card Animation
- Interactive NFC card demonstration on the homepage
- CSS animations and hover effects
- Visual representation of NFC technology

### Contact Form
- Client-side validation
- Server-side form processing
- Success message display
- Service interest selection

### Responsive Design
- Mobile-first approach
- Collapsible navigation menu
- Optimized layouts for all screen sizes
- Touch-friendly interface elements

### Performance
- Optimized CSS and JavaScript
- Efficient image handling
- Fast loading times
- SEO-optimized structure

## Deployment

The website is ready for deployment on platforms like:
- Heroku
- DigitalOcean
- AWS
- Vercel
- Netlify

Make sure to:
1. Set the `PORT` environment variable if needed
2. Update any hardcoded URLs for production
3. Configure email settings for the contact form

## Support

For technical support or questions about the website, contact the development team or refer to the documentation.

## License

This project is licensed under the MIT License.
