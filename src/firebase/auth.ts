import { signInWithPopup, signInWithRedirect, signOut, User } from 'firebase/auth';
import { auth, googleProvider } from './config';

export const signInWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Authentication Error: ", error);
    throw error;
  }
};

export const signInWithGoogleRedirect = async (): Promise<void> => {
  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (error) {
    console.error("Redirect Sign-In Error: ", error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error: ", error);
    throw error;
  }
};

