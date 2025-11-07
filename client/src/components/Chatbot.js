import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import axios from 'axios';

const Chatbot = ({ profile, plan }) => {
  const [messages, setMessages] = useState([
    { id: 1, role: 'model', content: 'Hi! I\'m your AI fitness coach. Ask me anything about workouts, nutrition, or your plan.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [
      ...messages,
      { id: Date.now(), role: 'user', content: text }
    ];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const history = nextMessages.map(m => ({ role: m.role, content: m.content }));
      const res = await axios.post('/api/chat', { message: text, history, profile, plan });
      const reply = res.data?.reply || 'Sorry, I did not get that.';
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'model', content: reply }]);
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Chat failed';
      setMessages(prev => [...prev, { id: Date.now() + 2, role: 'model', content: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Paper
      elevation={8}
      sx={{
        p: { xs: 2, md: 3 },
        borderRadius: 3,
        background: 'linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(124,58,237,0.16) 100%)',
        border: '1px solid rgba(148,163,184,0.2)'
      }}
    >
      <Typography variant="h5" component="h2" gutterBottom color="secondary">
        AI Coach Chat
      </Typography>

      <Box
        ref={listRef}
        sx={{
          height: { xs: 300, md: 360 },
          overflowY: 'auto',
          mb: 2,
          p: 1.5,
          borderRadius: 2,
          backgroundColor: 'rgba(15,23,42,0.4)',
          border: '1px solid rgba(148,163,184,0.2)'
        }}
      >
        <List dense>
          {messages.map(m => (
            <ListItem key={m.id} alignItems="flex-start" sx={{ display: 'block' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {m.role === 'user' ? 'You' : 'Coach'}
              </Typography>
              <ListItemText
                primary={
                  <Typography
                    component="div"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      mt: 0.5,
                      p: 1.25,
                      borderRadius: 2,
                      background: m.role === 'user'
                        ? 'linear-gradient(90deg, rgba(124,58,237,0.25), rgba(6,182,212,0.25))'
                        : 'linear-gradient(90deg, rgba(34,197,94,0.18), rgba(124,58,237,0.18))',
                      border: '1px solid rgba(148,163,184,0.25)'
                    }}
                  >
                    {m.content}
                  </Typography>
                }
              />
            </ListItem>
          ))}
          {loading && (
            <ListItem>
              <CircularProgress size={20} />
              <Typography variant="body2" sx={{ ml: 1 }}>Thinking…</Typography>
            </ListItem>
          )}
        </List>
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          placeholder="Ask about workouts, nutrition, or your plan…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <IconButton color="primary" onClick={sendMessage} disabled={loading || !input.trim()}>
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default Chatbot;
