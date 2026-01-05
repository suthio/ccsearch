import React from 'react'
import { Box, Text } from 'ink'

interface StatusBarProps {
  leftText?: string
  rightText?: string
}

export const StatusBar: React.FC<StatusBarProps> = ({ leftText, rightText }) => {
  return (
    <Box borderStyle="single" borderTop paddingX={1}>
      <Box flexGrow={1}>
        <Text dimColor>{leftText || 'q: quit | ?: help'}</Text>
      </Box>
      {rightText && (
        <Text dimColor>{rightText}</Text>
      )}
    </Box>
  )
}
