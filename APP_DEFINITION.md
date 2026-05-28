# App Definition

## What is WTVR?

**WTVR** (pronounced "whatever") is a lightweight, **text-based blog posting web application**. It gives people a simple, distraction-free space to publish short or long-form thoughts and read what others have written — no images, no embeds, no fluff. Just words.

The name reflects the spirit of the app: write whatever is on your mind, whenever, without friction.

---

## Core Idea

WTVR is built around two primary actions:

1. **Posting** — authenticated users write and publish text-only entries.
2. **Viewing** — anyone (or only authenticated users, depending on configuration) can browse and read posts.

Everything else in the app exists to support these two actions safely and clearly.

---

## Target Users

| User Type     | What They Do                                                  |
| ------------- | ------------------------------------------------------------- |
| **Reader**    | Browses the public feed and reads individual posts.           |
| **Author**    | A registered user who creates, edits, and deletes own posts.  |
| **Admin**     | Moderates posts and manages users via the admin dashboard.    |

Author and Admin roles map to the `user` and `admin` roles defined in `PROJECT_DESCRIPTION.md`.

---

## Core Features

### Posting
- Create a new post with a **title** and **plain-text body**.
- Edit or delete one's own posts.
- Posts are timestamped and attributed to their author.
- Optional draft state before publishing (stretch goal).

### Viewing
- Public **feed** showing the most recent posts in reverse-chronological order.
- Individual **post page** for reading a single entry.
- Author profile page listing all posts by a given user.
- Basic pagination on the feed.

### Accounts
- Register with email + password.
- Log in / log out.
- View and edit own profile.

### Admin
- View all users and posts.
- Soft-delete or hide posts that violate guidelines.
- View activity logs.

---

## Out of Scope (for v1)

To keep the app focused and small, the following are intentionally **excluded**:

- Image, video, or file uploads
- Rich-text or Markdown rendering (plain text only)
- Comments, likes, or reactions
- Following users or social graphs
- Notifications and email digests
- Tags, categories, or full-text search

These may be considered for future versions but are not part of the initial definition.

---

## Content Model

A **Post** is the single domain entity unique to WTVR:

| Field        | Type         | Notes                                    |
| ------------ | ------------ | ---------------------------------------- |
| `id`         | int          | Primary key                              |
| `author_id`  | int          | FK to `users.id`                         |
| `title`      | varchar(160) | Required, trimmed                        |
| `body`       | text         | Required, plain text, length-limited     |
| `status`     | enum         | `draft` \| `published` \| `hidden`       |
| `created_at` | datetime     | Set on insert                            |
| `updated_at` | datetime     | Auto-updates on edit                     |

All other infrastructure (users, roles, sessions, activity logs, security controls) is defined in `PROJECT_DESCRIPTION.md`.

---

## Design Principles

- **Text first.** No media, no formatting tricks. The content is the product.
- **Small surface area.** Few screens, few buttons, few decisions.
- **Secure by default.** Every post action is authenticated and audited.
- **Readable.** Typography and spacing optimized for reading on any device.

---

## Primary User Flows

1. **Read a post** → land on feed → click a title → read full post.
2. **Publish a post** → log in → click "New Post" → write title + body → publish.
3. **Manage own posts** → profile → see own posts → edit or delete.
4. **Moderate (admin)** → admin dashboard → review posts/users → hide or remove.

---

## Success Criteria

WTVR is considered successful when:

- A new user can register, publish a post, and see it on the feed in under a minute.
- Posts cannot be created, edited, or deleted by anyone other than their author or an admin.
- The app passes the security checklist in `PROJECT_DESCRIPTION.md` § 9.
