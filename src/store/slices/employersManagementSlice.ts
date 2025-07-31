import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { EmployersManagementService } from '../../services/employersManagementService';

/**
 * Employers management slice state interface
 */
interface EmployersManagementState {
  data: any[] | null;
  loading: boolean;
  error: string | null;
}

/**
 * Initial state for the employers management slice
 */
const initialState: EmployersManagementState = {
  data: null,
  loading: false,
  error: null,
};

/**
 * Async thunk for fetching employers management data
 */
export const fetchEmployersManagementData = createAsyncThunk(
  'employersManagement/fetchEmployersManagementData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await EmployersManagementService.getEmployersManagementData();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch employers management data');
    }
  }
);

/**
 * Employers management slice
 */
const employersManagementSlice = createSlice({
  name: 'employersManagement',
  initialState,
  reducers: {
    /**
     * Clear employers management data
     */
    clearEmployersManagementData: (state) => {
      state.data = null;
      state.error = null;
    },
    
    /**
     * Set loading state
     */
    setEmployersManagementLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    /**
     * Set error message
     */
    setEmployersManagementError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployersManagementData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployersManagementData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchEmployersManagementData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        toast.error(action.payload as string);
      });
  },
});

// Export actions
export const {
  clearEmployersManagementData,
  setEmployersManagementLoading,
  setEmployersManagementError,
} = employersManagementSlice.actions;

// Export reducer
export default employersManagementSlice.reducer;

// Export types
export type { EmployersManagementState }; 