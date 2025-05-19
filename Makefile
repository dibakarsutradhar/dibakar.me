HUGO_VERSION: 0.147.3

# Download Theme (if not already installed)
theme:
	git submodule add --depth=1 https://github.com/adityatelange/hugo-PaperMod.git themes/PaperMod

# Update Theme after reclone repo
theme-update:
	git submodule update --init --recursive

# Clean (theme)
clean-theme:
	rm -rf themes/PaperMod

# Clean (build)
clean:
	rm -rf public

# Use hugo mod download (optional)
# download-deps:
# 	hugo mod download

.PHONY: theme theme-update clean