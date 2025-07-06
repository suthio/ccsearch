import React from 'react'
import { X, Clock, MessageSquare, FolderOpen, ExternalLink } from 'lucide-react'

interface Message {
  role: string
  content?: string
  text?: string
  timestamp?: string
  type?: string
}

interface SessionDetailProps {
  session: {
    id: string
    project: string
    created_at: string
    updated_at: string
    messages: Message[]
  }
  onClose: () => void
  searchQuery?: string
}

export default function SessionDetail({ session, onClose, searchQuery }: SessionDetailProps) {
  const highlightText = (text: string) => {
    if (!searchQuery || !text) return text

    const regex = new RegExp(`(${searchQuery})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 font-semibold">
          {part}
        </span>
      ) : (
        part
      ),
    )
  }

  const openInClaude = async () => {
    try {
      await fetch('/api/open-claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      })
    } catch (error) {
      console.error('Failed to open in Claude:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Session Details</h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <FolderOpen className="w-4 h-4" />
                {session.project}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(session.created_at).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                {session.messages.length} messages
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openInClaude}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Claude
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {session.messages.map((message, index) => {
              const content = message.content || message.text || ''
              const role = message.role || (message.type === 'human' ? 'human' : 'assistant')

              return (
                <div
                  key={index}
                  className={`rounded-lg p-4 ${
                    role === 'human' || role === 'user' ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm capitalize">
                      {role === 'human' || role === 'user' ? 'You' : 'Claude'}
                    </span>
                    {message.timestamp && (
                      <span className="text-xs text-gray-500">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <div className="text-gray-700 whitespace-pre-wrap break-words">
                    {highlightText(content)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
