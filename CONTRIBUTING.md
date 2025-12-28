# Contributing to GrantStack

Thank you for your interest in contributing to GrantStack! 🎉

## 🚀 Getting Started

1. **Fork** the repository
2. **Clone** your fork locally
3. **Install** dependencies in all directories (`server`, `telegram-bot`, `web`)
4. **Create** a branch for your changes

## 💻 Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/grantstack.git
cd grantstack

# Install dependencies
cd server && npm install
cd ../telegram-bot && npm install
cd ../web && npm install

# Setup environment variables (copy .env.example files)

# Start development servers
# Terminal 1: cd server && npm run dev
# Terminal 2: cd telegram-bot && npm run dev
# Terminal 3: cd web && npm run dev
```

## 📝 Code Style

- Use **ESLint** for JavaScript/TypeScript linting
- Follow existing code patterns
- Add comments for complex logic
- Use meaningful variable and function names

## 🔀 Pull Request Process

1. **Update** documentation if needed
2. **Test** your changes thoroughly
3. **Commit** with clear, descriptive messages
4. **Push** to your fork
5. **Open** a Pull Request with:
   - Clear title and description
   - Reference to any related issues
   - Screenshots for UI changes

## 🐛 Bug Reports

When reporting bugs, please include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Screenshots or logs if applicable

## 💡 Feature Requests

We welcome feature suggestions! Please:

- Check if the feature already exists or is planned
- Describe the feature and its use case
- Explain why it would benefit the project

## 📋 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Provide constructive feedback
- Focus on the code, not the person

## 🏷️ Commit Message Format

```
type: short description

[optional body]
[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat: add video compression`
- `fix: resolve photo upload timeout`
- `docs: update API documentation`

## ❓ Questions?

Open an issue with the `question` label or reach out to the maintainers.

---

Thank you for contributing! 🙏
