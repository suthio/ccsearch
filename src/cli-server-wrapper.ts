#!/usr/bin/env node
// Wrapper for server functionality in npm package
export async function runServer(port: number) {
  try {
    // Try to use tsx to run the TypeScript server file
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { spawn } = require('child_process')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path')
    
    // Find the server-simple.ts file in the src directory
    const serverPath = path.join(__dirname, '../src/server-simple.ts')
    
    // Check if tsx is available
    let tsxPath
    try {
      tsxPath = require.resolve('tsx/cli')
    } catch {
       
      console.error('tsx not found. Please ensure tsx is installed.')
      process.exit(1)
    }
    
    // Run the server using tsx
    const child = spawn('node', [tsxPath, serverPath, '--port', port.toString()], {
      stdio: 'inherit',
      env: { ...process.env }
    })
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    child.on('error', (err: any) => {
       
      console.error('Failed to start server:', err)
      process.exit(1)
    })
    
    child.on('exit', (code: number) => {
      process.exit(code || 0)
    })
  } catch (error) {
     
    console.error('Error starting server:', error)
    process.exit(1)
  }
}