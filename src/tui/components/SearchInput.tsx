import React from 'react'
import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onSubmit,
  onCancel,
}) => {
  return (
    <Box borderStyle="single" paddingX={1}>
      <Text color="cyan">/</Text>
      <Box marginLeft={1} flexGrow={1}>
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder="Type to search..."
        />
      </Box>
      <Text dimColor> [Esc: cancel]</Text>
    </Box>
  )
}
