Conventions to follow
- yarn is the package manager for this project
- Always build the project and ask user to restart claude after making any changes otherwise the changes wont be reflected
- CI runs a gitleaks sensitive-data scan (config: .gitleaks.toml) on every PR; never commit real client/employee email addresses or secrets — use placeholder domains (example.com / .test)
- To run the same scan locally, install gitleaks (brew install gitleaks)
