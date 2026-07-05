# Contributing to Adavi Digital Institute LMS

Thank you for your interest in contributing to the Adavi Digital Institute Learning Management System (LMS).

This document outlines the standards and workflow for contributing to the project. Following these guidelines helps maintain code quality, consistency, and project stability.

---

# Table of Contents

- Project Overview
- Development Requirements
- Repository Setup
- Branch Strategy
- Coding Standards
- Commit Message Convention
- Pull Request Process
- Code Review
- Testing Requirements
- Documentation
- Reporting Issues
- Security

---

# Project Overview

Adavi Digital Institute LMS is an enterprise-grade e-learning platform designed to provide a secure, scalable, and AI-powered learning experience.

The project consists of:

- Frontend (React / Next.js)
- Backend (Node.js / Express)
- PostgreSQL Database
- REST API
- AI Integration
- Docker Deployment

---

# Development Requirements

Before contributing, ensure the following software is installed:

- Node.js 22+
- npm or pnpm
- PostgreSQL
- Git
- Docker Desktop (optional)

---

# Repository Setup

Clone the repository

git clone https://github.com/adavidigital/adavi-digital-lms.git

Navigate to the project

cd adavi-digital-institute-lms

Install dependencies

npm install

Copy the environment file

cp .env.example .env

Configure the environment variables.

Run the application

npm run dev

---

# Branch Strategy

Do not commit directly to the main branch.

Create a feature branch.

Examples

feature/student-dashboard

feature/payment-module

feature/certificate-generator

feature/ai-chatbot

bugfix/login-error

hotfix/payment-timeout

docs/readme-update

---

# Coding Standards

## JavaScript / TypeScript

- Use ES2022+ syntax
- Prefer async/await over callbacks
- Use meaningful variable names
- Avoid duplicate code
- Keep functions focused and reusable

## React

- Use functional components
- Use Hooks
- Organize components by feature
- Keep components small and reusable

## Backend

- Follow REST API principles
- Validate all incoming requests
- Handle errors gracefully
- Use environment variables for secrets

## Database

- Never modify production data directly
- Create migrations for schema changes
- Use descriptive table and column names

---

# Commit Message Convention

Follow Conventional Commits.

Examples

feat: add instructor dashboard

fix: resolve login validation bug

docs: update deployment guide

style: format authentication controller

refactor: simplify enrollment service

test: add authentication unit tests

chore: update dependencies

---

# Pull Request Process

Before opening a Pull Request:

- Ensure the project builds successfully.
- Ensure all tests pass.
- Update documentation if required.
- Resolve merge conflicts.
- Remove unused code and files.

Pull Request Checklist

- Code compiles successfully
- No console errors
- Tests pass
- Documentation updated
- Screenshots included (if UI changes)
- Reviewer assigned

---

# Code Review

Every Pull Request must be reviewed before merging.

Reviewers will check:

- Code quality
- Performance
- Security
- Readability
- Documentation
- Testing

---

# Testing Requirements

Before submitting changes, run:

npm test

Also verify:

- Authentication
- Course creation
- Enrollment
- Assignments
- Certificates
- Dashboard
- Payment flow

---

# Documentation

Update documentation whenever changes affect:

- API
- Database
- Deployment
- User Interface
- Environment Variables

Relevant files include:

README.md

CHANGELOG.md

API.md

Deployment.md

---

# Reporting Issues

When reporting an issue, include:

- Operating System
- Browser
- Node.js Version
- Steps to Reproduce
- Expected Result
- Actual Result
- Screenshots (if applicable)

---

# Security

Do not commit:

- .env
- API keys
- JWT secrets
- Database credentials
- Private certificates

Report security vulnerabilities privately to:

security@adavidigitalinstitute.com

---

# Questions

For development questions, contact the project maintainer.

Email:

info@adavidigitalinstitute.com

---

Thank you for contributing to Adavi Digital Institute LMS.

Together we are building a world-class AI-powered education platform.
