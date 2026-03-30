# 🤝 Contributing Guide

Thank you for wanting to make this repo better! Follow these steps to get started:

1. **Fork the Repository**
   - Click the **Fork** button at the top-right of this repository to create your own copy.

2. **Clone Your Fork**
```bash
   git clone https://github.com/<your-username>/clipboard-saver-extension.git
   cd clipboard-saver-extension
```

3. **Create a New Branch**

- Make a new branch for your feature or bug fix:
```bash
git checkout -b my-branch
```
4. **Make Your Changes**

- Implement your feature, fix bugs, or update documentation.
- Ensure your changes are tested in Chrome by loading the unpacked extension.

5. **Guidelines to commit your changes**

To keep our commit history clean and easy to follow, use these prefixes for Clipboard Saver development:

- `feat:` - New feature or enhancement (e.g., new saving or export functionality)  
- `docs:` - Documentation updates (README, tips, instructions)  
- `fix:` - Bug fixes (e.g., clipboard saving issues, UI bugs)  
- `refactor:` - Code improvements without changing functionality (e.g., restructuring popup.js or content scripts)  
- `test:` - Adding or updating tests (if applicable)  
- `chore:` - Maintenance tasks (dependencies, build scripts, minor cleanup)

**Examples of prefixes:**
```
feat: add CSV export option
docs: update README with installation steps
fix: resolve clipboard not saving issue in Chrome
refactor: reorganize popup.js for better readability
chore: update manifest.json version to 1.0.0
```

Commit and push to your branch

7. **Open a Pull Request**

- Go to the original repository and click Compare & pull request.
- Describe your changes clearly, link related issues if any, and submit the PR.

## 📙 Code of Conduct

- Keep code clean and well-commented.
- Follow consistent formatting (JavaScript conventions for popup.js and content scripts).
- For documentation changes, update README sections clearly.
- Small, focused PRs are easier to review than large ones.
- Be respectful and inclusive

Thank you for making this project better for everyone! 🙏