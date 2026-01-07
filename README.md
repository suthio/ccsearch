# ccsearch - Claude Conversation Search

A powerful search and management tool for Claude AI conversation sessions. Search, browse, export, and import your Claude conversation history with ease.

## Features

### 🔍 Advanced Search

- Full-text search across all conversation history
- Multi-term search with relevance scoring
- Project-based filtering
- Title and content weighted search
- Contextual highlights with surrounding text
- Tag-based filtering for organized session management

### 💻 Triple Interface

- **CLI mode**: Direct command-line search and export
- **TUI (Terminal User Interface)**: Interactive terminal-based interface
  - Browse and search sessions directly in your terminal
  - Keyboard navigation (j/k, arrow keys)
  - Real-time search with instant filtering
  - Session detail view with full conversation history
  - No browser required - works entirely in terminal
- **Web UI**: Browser-based intuitive interface
  - Real-time search
  - Session list view
  - Full conversation viewer
  - Batch selection
  - Dark mode support with persistent preferences
  - Multi-language support (English/Japanese)

### 🎯 Enhanced Filtering & Sorting

- **Tag Management**: Add, edit, and filter sessions by custom tags
- **Advanced Filters**:
  - Date range filtering (from/to dates)
  - Message count filtering (min/max)
  - Active filter indicators
- **Smart Sorting**: Sort by update time, creation time, or message count

### 📤 Export/Import

- Selective export (by project, recent N sessions)
- Batch export for multiple sessions
- Cross-platform support with path normalization
- Import preview functionality with dedicated import mode
- Complete data preservation in JSON format

### 🔗 Claude CLI Integration

- One-click session resumption in Claude CLI
- Direct access via session ID
- Automatic session detection from `~/.claude/projects/`

### 🌐 Internationalization

- Full UI translation support
- Available in English and Japanese
- Auto-detection of browser language preference
- Persistent language selection

## Installation

### Global Installation

```bash
npm install -g ccsearch
```

### Use with npx (no installation required)

```bash
# Run the latest version
npx ccsearch@latest

# Run with custom port
npx ccsearch@latest --port 8080

# Export sessions
npx ccsearch@latest export -l 10 -o sessions.json

# Search sessions
npx ccsearch@latest search "your search query"

# Launch Terminal User Interface
npx ccsearch@latest tui
```

## Quick Start

```bash
# Option 1: Launch Terminal User Interface (no browser needed)
npx ccsearch@latest tui

# Option 2: Start the web interface
npx ccsearch@latest
# Open your browser to http://localhost:3210
```

## Usage

### CLI Commands

```bash
# Start the web server (default port: 3210)
ccsearch

# Start with custom port
ccsearch --port 8080

# Export recent sessions
ccsearch export -l 10 -o recent-sessions.json

# Export from specific project
ccsearch export -p /path/to/project -o project-sessions.json

# Interactive export mode
ccsearch export -i

# Search from command line
ccsearch search "API implementation"

# Launch Terminal User Interface
ccsearch tui
```

### CLI Options

#### Global Options

- `--port <number>`: Specify custom port for web server (default: 3210)

#### Export Options

- `-p, --project <path>`: Filter by project path
- `-l, --last <number>`: Export last N sessions
- `-i, --interactive`: Interactive session selection mode
- `-o, --output <file>`: Output file path (default: ccsearch-export.json)

### Terminal User Interface (TUI)

Launch an interactive terminal interface for browsing and searching sessions:

```bash
ccsearch tui
```

**Keyboard Shortcuts:**

*In List View:*
- `j` / `↓`: Navigate down
- `k` / `↑`: Navigate up
- `gg`: Jump to top
- `G`: Jump to bottom
- `Ctrl+D`: Page down (10 items)
- `Ctrl+U`: Page up (10 items)
- `Enter`: Open selected session detail view
- `/`: Start search
- `Esc`: Cancel search
- `q`: Quit TUI

*In Detail View:*
- `j` / `↓`: Scroll down
- `k` / `↑`: Scroll up
- `g`: Jump to top
- `G`: Jump to bottom
- `Ctrl+D`: Scroll down 5 messages
- `Ctrl+U`: Scroll up 5 messages
- `Esc` / `q`: Go back to list view

**Features:**
- Browse all Claude sessions in your terminal
- Real-time search filtering
- View full conversation details
- Navigate between list and detail views
- No browser required - works entirely in terminal

### Web Interface

1. Start the server:

   ```bash
   ccsearch
   # or with custom port
   ccsearch --port 8080
   ```

2. Open your browser to `http://localhost:3210` (or your custom port)

3. Use the interface to:
   - Search conversations with keywords
   - Filter by project
   - Select multiple sessions
   - Export selected sessions
   - Open sessions in Claude CLI

## Export Format

Exported data follows this structure:

```json
{
  "version": "1.1",
  "exportDate": "2024-01-01T00:00:00.000Z",
  "sessionCount": 10,
  "exportedFrom": "darwin",
  "sessions": [
    {
      "id": "session-id",
      "title": "Session Title",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z",
      "messages": [
        {
          "role": "user",
          "content": "Message content",
          "timestamp": "2024-01-01T00:00:00.000Z"
        }
      ],
      "project": "/path/to/project"
    }
  ]
}
```

## Technical Details

### Architecture

- **Backend**: Node.js/TypeScript with Express
- **Frontend**: React/TypeScript
- **Data Format**: JSONL (Claude's native format)
- **Search Algorithm**: Full-text search with relevance scoring

### Requirements

- Node.js 16+
- Claude CLI (for session opening functionality)
- Access to `~/.claude/projects/` directory

## Development

```bash
# Clone the repository
git clone https://github.com/suthio/ccsearch.git
cd ccsearch

# Install dependencies
npm install

# Development mode (with hot reload)
npm run dev

# Development with unified server (single port)
npm run dev:unified

# Build for production
npm run build

# Start production server
npm start
```

### Recent Updates

#### Terminal User Interface (TUI) (2025-01-XX)

- **New Terminal Interface**: Browse and search Claude sessions directly in your terminal
- **Keyboard Navigation**: Full vim-style navigation (j/k, gg/G, Ctrl+D/U)
- **Real-time Search**: Instant filtering as you type
- **Session Detail View**: View full conversation history with scrollable message view
- **No Browser Required**: Complete terminal-based experience
- Launch with `ccsearch tui` or `npx ccsearch@latest tui`

#### Session Analysis and Enhanced UI (2025-07-03)

- **Session Content Analysis**: Automatically detects conversation type (coding, debugging, Q&A, etc.)
- **Enhanced Session List**: Shows conversation topics, duration, code blocks, and error indicators
- **Improved Detail View**:
  - Session summary with key statistics and insights
  - Compact/full message view toggle
  - Better message formatting with role colors and numbering
- **Smart Message Preview**: Displays important messages (questions, errors) first

#### Enhanced Session Preview (2025-07-03)

- Improved session preview to show multiple messages instead of just the first one
- Preview now displays up to 5 messages with role indicators (User/Assistant)
- Color-coded roles for better readability (blue for User, green for Assistant)
- Enhanced expanded view with up to 10 messages and better formatting
- Added hover effects and improved UI responsiveness

#### Search Enhancement (2025-07-03)

- Fixed search functionality to include `tool_result` content in Claude sessions
- Tool results (like file contents shown by Claude) are now searchable
- This allows searching for content within files that Claude displayed using tools

#### Unified Server

- Added unified server mode that serves both API and Web UI on a single port
- Use `npm run dev:unified` for development or `npm start` for production
- Default port is 3210 for both API and static file serving
- Eliminates CORS issues and simplifies deployment

#### Internationalization and Enhanced UI (2025-07-06)

- **Full Internationalization Support**:
  - Complete UI translation for English and Japanese
  - Auto-detection of browser language preference
  - Language switcher component for easy language toggling
  - Persistent language selection stored in localStorage
- **Dark Mode**:
  - Toggle between light and dark themes
  - Persistent theme preference
  - Application-wide theme context
- **Advanced Filtering System**:
  - Tag-based filtering with tag editor and visual indicators
  - Date range filtering (from/to dates)
  - Message count filtering (min/max)
  - Active filter indicators with reset functionality
- **Enhanced Sorting Options**:
  - Sort by update time, creation time, or message count
  - Visual icons for each sort option
  - Persistent sort preference
- **Import Mode Enhancement**:
  - Dedicated import context with visual indicators
  - "Import Mode" banner during active imports
  - Improved import workflow management

## Unique Features

- **Smart Path Normalization**: Handles project paths across Windows/Mac/Linux
- **Relevance Scoring**: Title matches weighted higher in search results
- **Context Preservation**: Shows search matches with surrounding context
- **Batch Operations**: Select and process multiple sessions at once
- **Import Preview**: Browse and search imported sessions before integration

## License

MIT

## Contributing

Issues and pull requests are welcome at [https://github.com/suthio/ccsearch](https://github.com/suthio/ccsearch)
