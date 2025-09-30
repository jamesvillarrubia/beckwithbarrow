# 🏗️ Monorepo Setup with Nx + pnpm

This repository is now configured as an **Nx monorepo** with **pnpm workspaces** for optimal dependency management and build orchestration.

## 📁 Project Structure

```
beckwithbarrow/
├── api/                    # Strapi backend
├── frontend/              # React frontend
├── docs/                  # Documentation
├── scripts/               # Shared scripts
├── package.json           # Root package.json
├── pnpm-workspace.yaml    # pnpm workspace config
├── nx.json               # Nx configuration
└── .husky/               # Git hooks
```

## 🚀 Quick Start

### Install Dependencies
```bash
# Install all dependencies across all projects
pnpm install
```

### Development
```bash
# Run all projects in development mode
pnpm run dev

# Run specific project
pnpm run dev:api
pnpm run dev:frontend

# Using Nx directly
npx nx run api:dev
npx nx run frontend:dev
```

### Building
```bash
# Build all projects
pnpm run build

# Build specific project
pnpm run build:api
pnpm run build:frontend

# Using Nx directly
npx nx run api:build
npx nx run frontend:build
```

## 🛠️ Available Commands

### Root Level Commands
- `pnpm install` - Install all dependencies
- `pnpm run dev` - Start all projects in development
- `pnpm run build` - Build all projects
- `pnpm run lint` - Lint all projects
- `pnpm run test` - Test all projects

### Project-Specific Commands
- `pnpm run dev:api` - Start API development server
- `pnpm run dev:frontend` - Start frontend development server
- `pnpm run build:api` - Build API
- `pnpm run build:frontend` - Build frontend

### Nx Commands
- `npx nx show projects` - List all projects
- `npx nx run <project>:<target>` - Run specific target on project
- `npx nx run-many --target=<target> --all` - Run target on all projects
- `npx nx graph` - Visualize project dependencies

## 🔧 Configuration Files

### `pnpm-workspace.yaml`
Defines the workspace packages:
```yaml
packages:
  - 'api'
  - 'frontend'
  - 'packages/*'
```

### `nx.json`
Nx configuration for build orchestration and caching.

### `project.json` (per project)
Defines project targets and configuration:
- **api/project.json** - Strapi backend targets
- **frontend/project.json** - React frontend targets

## 🎯 Benefits

### Dependency Management
- **Single lock file** - `pnpm-lock.yaml` manages all dependencies
- **Shared dependencies** - Common packages are deduplicated
- **Workspace isolation** - Each project has its own dependencies

### Build Orchestration
- **Parallel execution** - Run multiple projects simultaneously
- **Dependency tracking** - Build projects in correct order
- **Caching** - Nx caches build results for faster rebuilds

### Development Experience
- **Single command** - `pnpm install` installs everything
- **Unified scripts** - Consistent commands across projects
- **Better tooling** - Nx provides advanced project management

## 🔒 Security

The monorepo includes **Gitleaks + Husky** protection:
- **Pre-commit hooks** scan for secrets before commits
- **Team-wide protection** - all developers get security hooks
- **Automatic scanning** - no manual intervention required

## 📚 Next Steps

1. **Add new projects** - Create in `packages/` directory
2. **Configure CI/CD** - Use Nx affected commands for efficient builds
3. **Add testing** - Configure test targets for each project
4. **Optimize builds** - Use Nx caching for faster CI/CD

---
**Setup Date**: September 30, 2025  
**Status**: ✅ ACTIVE - Full monorepo with pnpm workspaces and Nx orchestration
