import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Sample slice state interface
 */
interface SampleState {
  count: number;
  loading: boolean;
  error: string | null;
}

/**
 * Initial state for the sample slice
 */
const initialState: SampleState = {
  count: 0,
  loading: false,
  error: null,
};

/**
 * Sample slice with basic counter functionality
 * This serves as a placeholder and example for creating other slices
 */
const sampleSlice = createSlice({
  name: 'sample',
  initialState,
  reducers: {
    /**
     * Increment the counter
     */
    increment: (state) => {
      state.count += 1;
    },
    
    /**
     * Decrement the counter
     */
    decrement: (state) => {
      state.count -= 1;
    },
    
    /**
     * Reset the counter to zero
     */
    reset: (state) => {
      state.count = 0;
    },
    
    /**
     * Set the counter to a specific value
     */
    setCount: (state, action: PayloadAction<number>) => {
      state.count = action.payload;
    },
    
    /**
     * Set loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    /**
     * Set error message
     */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

// Export actions
export const {
  increment,
  decrement,
  reset,
  setCount,
  setLoading,
  setError,
} = sampleSlice.actions;

// Export reducer
export default sampleSlice.reducer;

// Export types
export type { SampleState }; 