import {
  configureStore,
  createAsyncThunk,
  createSlice,
} from "@reduxjs/toolkit";
import { getBrands, getOffers } from "../api/parts.js";

export const fetchBrands = createAsyncThunk(
  "search/brands",
  (article, { signal }) => getBrands(article, signal),
);
export const fetchOffers = createAsyncThunk(
  "search/offers",
  (query, { signal }) => getOffers(query, signal),
);
const fresh = () => ({
  items: [],
  status: "idle",
  error: null,
  requestId: null,
});
const initialState = {
  article: "",
  brand: null,
  brands: fresh(),
  offers: fresh(),
};

const slice = createSlice({
  name: "search",
  initialState,
  reducers: {
    setArticle(state, { payload }) {
      state.article = payload;
      state.brand = null;
      state.brands = fresh();
      state.offers = fresh();
    },
    selectBrand(state, { payload }) {
      state.brand = payload;
      state.offers = fresh();
    },
  },
  extraReducers(builder) {
    for (const [key, thunk] of [
      ["brands", fetchBrands],
      ["offers", fetchOffers],
    ]) {
      builder.addCase(thunk.pending, (state, action) => {
        state[key] = {
          ...fresh(),
          status: "loading",
          requestId: action.meta.requestId,
        };
      });
      builder.addCase(thunk.fulfilled, (state, action) => {
        if (state[key].requestId !== action.meta.requestId) return;
        state[key] = {
          items: action.payload,
          status: "succeeded",
          error: null,
          requestId: null,
        };
      });
      builder.addCase(thunk.rejected, (state, action) => {
        if (state[key].requestId !== action.meta.requestId) return;
        state[key] = {
          ...fresh(),
          status: action.meta.aborted ? "idle" : "failed",
          error: action.meta.aborted ? null : action.error.message,
        };
      });
    }
  },
});

export const { setArticle, selectBrand } = slice.actions;
export const searchReducer = slice.reducer;
export const createAppStore = () =>
  configureStore({ reducer: { search: searchReducer } });
