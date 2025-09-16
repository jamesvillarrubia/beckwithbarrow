# Beckwith Barrow

A modern portfolio website built with Strapi CMS backend and React frontend, showcasing projects with beautiful design and responsive layouts.

## 🏗️ Project Structure

This is a monorepo containing two main applications:

```
beckwithbarrow/
├── api/          # Strapi CMS backend
├── frontend/     # React frontend application
└── README.md     # This file
```

## 🚀 Features

- **Modern Stack**: Strapi CMS + React + TypeScript + Tailwind CSS
- **Project Showcase**: Beautiful project cards with cover images and galleries
- **Category System**: Organize projects by categories with styled badges
- **Responsive Design**: Works perfectly on all devices and screen sizes
- **Image Management**: Support for cover images and gallery collections
- **API Integration**: Seamless communication between frontend and backend

## 📦 Tech Stack

### Backend (Strapi CMS)
- **Strapi v5** - Headless CMS
- **TypeScript** - Type safety
- **PostgreSQL** - Database (configurable)
- **Node.js v22** - Runtime environment

### Frontend (React)
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS v4** - Utility-first CSS framework
- **TanStack Query** - Data fetching and caching
- **Axios** - HTTP client

## 🛠️ Development Setup

### Prerequisites
- Node.js v22 (specified in `.nvmrc` files)
- pnpm package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jamesvillarrubia/beckwithbarrow.git
   cd beckwithbarrow
   ```

2. **Install dependencies for both applications**
   ```bash
   # Install backend dependencies
   cd api
   pnpm install
   
   # Install frontend dependencies  
   cd ../frontend
   pnpm install
   ```

3. **Configure environment variables**
   ```bash
   # In the api/ directory
   cp .env.example .env
   # Edit .env with your database credentials and other settings
   ```

4. **Start the development servers**
   
   **Backend (Strapi):**
   ```bash
   cd api
   pnpm develop
   ```
   
   **Frontend (React):**
   ```bash
   cd frontend
   pnpm dev
   ```

5. **Access the applications**
   - **Strapi Admin**: http://localhost:1337/admin
   - **Frontend**: http://localhost:5173
   - **Strapi API**: http://localhost:1337/api

## 📝 Content Management

### Setting up Strapi

1. **Create an admin user** when you first access http://localhost:1337/admin
2. **Configure public permissions**:
   - Go to Settings → Users & Permissions Plugin → Roles → Public
   - Enable `find` and `findOne` permissions for your content types
3. **Create content**:
   - Add categories in Content Manager → Categories
   - Create projects with titles, descriptions, cover images, and galleries
   - Make sure to **Publish** your content (not just save as draft)

### Content Types

- **Projects**: Main portfolio items with title, description, cover image, and gallery
- **Categories**: Organize projects by type (homes, commercial, etc.)
- **Global**: Site-wide settings and information
- **About**: About page content

## 🎨 Frontend Features

- **Project Cards**: Beautiful glass-morphism design with hover effects
- **Image Galleries**: Cover images with additional gallery counts
- **Category Badges**: Styled category indicators
- **Responsive Grid**: Adaptive layout for different screen sizes
- **Loading States**: Smooth loading spinners and error handling
- **Professional Typography**: Modern font choices and spacing

## 🚀 Deployment

### Backend Deployment
- Configure your production database
- Set environment variables for production
- Deploy to platforms like Railway, Heroku, or DigitalOcean

### Frontend Deployment
- Build the frontend: `pnpm build`
- Deploy to Vercel, Netlify, or any static hosting service
- Update API base URL for production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and commit: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with [Strapi](https://strapi.io/) - The leading open-source headless CMS
- Styled with [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework
- Powered by [React](https://react.dev/) and [Vite](https://vitejs.dev/)
