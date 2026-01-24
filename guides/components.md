# Components Guide

## Key Components

### EndpointPicker (`src/lib/components/EndpointPicker.svelte`)
*   **Purpose**: Renders a grid of available GraphQL endpoints.
*   **Usage**: Displays endpoints from the store and allows selection.

### CodeEditor (`src/lib/components/fields/CodeEditor.svelte`)
*   **Purpose**: Provides a code editing interface (likely using CodeMirror).
*   **Props**: `rawValue` (string), `language` (string), `onChanged` (callback).

### Modal (`src/lib/components/Modal.svelte`)
*   **Purpose**: A generic modal component using the native `<dialog>` element.
*   **Usage**: Used for confirmations, forms, and other overlays.

### TypeInfoDisplay (`src/lib/components/TypeInfoDisplay.svelte`)
*   **Purpose**: Displays information about GraphQL types, allowing expansion and interaction.

### ActiveArgument (`src/lib/components/ActiveArgument.svelte`)
*   **Purpose**: Represents an active argument in the query builder, allowing modification of its value and state.

### ComponentForLayout (`src/routes/endpoints/[endpointid]/queries/[queryName]/ComponentForLayout.svelte`)
*   **Purpose**: The main layout component for displaying and interacting with a specific query/mutation.
*   **Usage**: Handles data fetching, pagination, and rendering the results table. It orchestrates the interaction between the query builder and the results display.
