import { useEffect, useState } from 'react';
import { Snackbar } from 'react-native-paper';
import { clearToast, subscribeToast } from './toast';

export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => subscribeToast(setMessage), []);

  return (
    <Snackbar visible={!!message} onDismiss={clearToast} duration={4000}>
      {message}
    </Snackbar>
  );
}
