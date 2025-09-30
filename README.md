# Beckwith Barrow

A modern portfolio website built with Strapi CMS backend and React frontend, showcasing projects with beautiful design and responsive layouts.

## 🏗️ Project Structure

This is a **monorepo** powered by **Nx** and **pnpm workspaces**:

```
beckwithbarrow/
├── api/                    # Strapi CMS backend
├── frontend/              # React frontend application
├── docs/                  # Project documentation
├── scripts/               # Build and utility scripts
├── package.json           # Root package.json
├── pnpm-workspace.yaml    # pnpm workspace config
├── nx.json               # Nx configuration
└── .husky/               # Git hooks (secrets protection)
```

### 🎯 Monorepo Benefits
- **Single command setup**: `pnpm install` installs everything
- **Unified development**: `pnpm run dev` starts all projects
- **Dependency management**: Shared packages are deduplicated
- **Build orchestration**: Nx manages build order and caching
- **Team consistency**: Everyone uses the same tooling

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

2. **Install all dependencies (monorepo)**
   ```bash
   # Install all dependencies across all projects
   pnpm install
   ```

3. **Configure environment variables**
   ```bash
   # In the api/ directory
   cp .env.example .env
   # Edit .env with your database credentials and other settings
   ```

4. **Start the development servers**
   
   **All projects at once:**
   ```bash
   pnpm run dev
   ```
   
   **Individual projects:**
   ```bash
   pnpm run dev:api       # Backend (Strapi)
   pnpm run dev:frontend  # Frontend (React)
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

## 🔄 Data Management & Scripts

This project includes a comprehensive set of scripts for managing data between local development and Strapi Cloud production. **IMPORTANT**: Before creating any new scripts, check the existing ones first!

### 📋 Available Scripts Overview

**See `AI-INSTRUCTIONS.md` for complete script documentation and usage guidelines.**

#### 🔄 Data Transfer (Bidirectional)
```bash
# Push local data TO cloud
pnpm transfer:to-cloud                    # Full transfer
pnpm transfer:to-cloud:content-only       # Content only (no media)
pnpm transfer:to-cloud:force              # Skip confirmation

# Pull cloud data TO local  
pnpm transfer:from-cloud                  # Full transfer
pnpm transfer:from-cloud:content-only     # Content only (no media)
pnpm transfer:from-cloud:force            # Skip confirmation

# Preview transfers (dry run)
pnpm transfer:dry-run
```

#### 💾 Local Backups
```bash
pnpm backup                # Full backup with cleanup
pnpm backup:quick          # Fast backup without extras
pnpm backup:verbose        # Detailed output
pnpm backup:list           # List all local backups
```

#### ☁️ Cloud Backups  
```bash
pnpm backup:cloud                # Download from cloud
pnpm backup:cloud:verbose        # Detailed output
pnpm backup:cloud:config         # Configuration help
```

#### 🚀 Deployment
```bash
pnpm deploy:cloud                # Deploy to cloud (with backups)
pnpm deploy:cloud:dry-run        # Preview deployment
```

### ⚠️ Current Backup System Issues

**The backup system is currently chaotic** with inconsistent naming:
- `quick-backup-*`, `strapi-backup-*`, `pre-transfer-*`, etc.
- Multiple overlapping backup types
- Confusing retention policies

**Solution**: A redesign plan exists in `api/BACKUP-SYSTEM-REDESIGN.md` to standardize everything.

### 🔧 Cloud Configuration

For cloud operations, you need `api/strapi-cloud.env`:
```bash
cd api
cp strapi-cloud.env.example strapi-cloud.env
# Edit with your Strapi Cloud credentials
source strapi-cloud.env
```

## 🚀 Deployment

### Backend Deployment
- Configure your production database
- Set environment variables for production
- Deploy to platforms like Railway, Heroku, or DigitalOcean
- Use `pnpm deploy:cloud` for Strapi Cloud deployment

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
