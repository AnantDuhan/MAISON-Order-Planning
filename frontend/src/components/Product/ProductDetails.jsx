import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { Rating } from "@mui/material";
import React, { Fragment, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import LoadingBar from "react-top-loading-bar";
import Loader from "../layout/Loader/Loader";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";

import { addItemsToCart } from "../../actions/cartAction";
import BackInStockButton from "./BackInStockButton";
import VariantPicker, { colorOption, defaultSelection, findSelectedVariant, imagesForColor } from "./VariantPicker";
import ProductGallery from "./ProductGallery";
import {
  addProductToWishlist,
  clearErrors,
  getProductDetails,
  newReview,
  summarizeProductReviews,
} from "../../actions/productAction";
import {
  NEW_REVIEW_RESET,
  REALTIME_PRODUCT_UPDATE,
  SUMMARIZE_REVIEWS_RESET,
} from "../../constants/productConstants";
import MetaData from "../layout/MetaData";
import { formatINR } from "../../utils/priceLabel";
import { cleanText } from "../../utils/cleanText";
import ReviewsSection from "./ReviewsSection";
import {
  Breadcrumbs,
  DeliveryLine,
  Highlights,
  ProductInfo,
  ProductJsonLd,
  RecentlyViewed,
  RelatedProducts,
} from "./ProductExtras";

import io from "socket.io-client";
import { useFeature } from '../../context/FeatureFlagsContext';
import { useMembershipTier } from "../../utils/useIsMember";

const ProductDetails = () => {
  const dispatch = useDispatch();
  const { id } = useParams();

  const { product, loading, error } = useSelector(
    (state) => state.productDetails,
  );
  const { user } = useSelector((state) => state.user);
  const { wishlist } = useSelector((state) => state.wishlist);
  const { success, error: reviewError } = useSelector(
    (state) => state.newReview,
  );
  const {
    loading: summaryLoading,
    isSummarized,
  } = useSelector((state) => state.reviewSummary);

  const [progress, setProgress] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [lightboxIsOpen, setLightboxIsOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);

  const onLoaderFinished = () => setProgress(0);

  const options = {
    size: "medium",
    value: product?.ratings,
    readOnly: true,
    precision: 0.5,
  };

  const generateSummaryHandler = () => {
    dispatch(summarizeProductReviews(id));
  };

  // Options (Size, Colour…): which combination the shopper has picked.
  const [selection, setSelection] = useState({});
  const hasOptions = (product?.options || []).length > 0;
  const selectedVariant = hasOptions ? findSelectedVariant(product, selection) : null;

  // Picking a colour switches the gallery to that colour's photos.
  const chosenColor = selection[colorOption(product)?.name];
  const galleryImages = imagesForColor(product, chosenColor);

  // Options still to choose, shown in the picker after a failed "Add to bag".
  const [missing, setMissing] = useState([]);
  const pickerRef = useRef(null);
  const chooseOptions = (next) => {
    setSelection(next);
    setQuantity(1);
    setMissing((m) => m.filter((name) => !next[name]));
  };

  // Single-value options, and the first colour in stock, start selected.
  useEffect(() => {
    if (!product?._id) return;
    setSelection(defaultSelection(product));
    setQuantity(1);
    setMissing([]);
  }, [product?._id]);

  // Phones: a buy bar pinned to the bottom whenever the main buy button is
  // off screen — below the first screen on short phones, or scrolled past.
  const buyRowRef = useRef(null);
  const [showBuyBar, setShowBuyBar] = useState(false);
  useEffect(() => {
    const el = buyRowRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setShowBuyBar(!entry.isIntersecting),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [product?._id, loading]);

  const addToCartHandler = async () => {
    if (hasOptions && !selectedVariant) {
      const names = product.options.filter((o) => !selection[o.name]).map((o) => o.name);
      setMissing(names);
      pickerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.info(`Please choose ${names.map((n) => n.toLowerCase()).join(' and ') || 'an option'}`);
      return;
    }
    try {
      await dispatch(addItemsToCart(id, quantity, selectedVariant?._id || null));
      toast.success(selectedVariant ? `Added to your bag · ${Object.values(selection).filter(Boolean).join(' / ')}` : "Item Added To Cart");
      setProgress(progress + 80);
    } catch (error) {
      toast.error(error.message || "Could not add to your bag");
    }
  };

  const inWishlist = (wishlist || []).some((item) => (item.product || item._id) === id);
  const wishlistHandler = () => {
    if (inWishlist) {
      toast.info("Product is already in the wishlist");
    } else {
      dispatch(addProductToWishlist(id));
      toast.success("Item Added To Wishlist");
    }
    setProgress(progress + 80);
  };

  const reviewsOn = useFeature('reviews');
  const tier = useMembershipTier();
  const earlyAccessUntil = product?.earlyAccessUntil ? new Date(product.earlyAccessUntil) : null;
  const earlyAccessLive = Boolean(earlyAccessUntil && earlyAccessUntil > new Date());
  const lockedForMe = earlyAccessLive && tier !== 'plus';
  const opensLabel = earlyAccessUntil
    ? earlyAccessUntil.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : '';
  const backInStockOn = useFeature('backInStock');

  const submitReviewToggle = () => {
    open ? setOpen(false) : setOpen(true);
  };

  const reviewSubmitHandler = () => {
    const reviewData = { productId: id, comment, rating: Number(rating) };
    dispatch(newReview(reviewData));
    setOpen(false);
    setProgress(progress + 80);
  };

  const openLightbox = (index) => {
    setLightboxImageIndex(index);
    setLightboxIsOpen(true);
  };

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) setProgress(0);
    }, 5000);

    setProgress(100);

    if (error) {
      toast.error(error);
      dispatch(clearErrors());
    }
    if (reviewError) {
      toast.error(reviewError);
      dispatch(clearErrors());
    }
    if (success) {
      toast.success("Review Added Successfully");
      dispatch({ type: NEW_REVIEW_RESET });
    }
    if (isSummarized) {
      toast.success("AI Summary Generated!");
      dispatch({ type: SUMMARIZE_REVIEWS_RESET });
    }
    dispatch(getProductDetails(id));

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [dispatch, id, error, reviewError, success, isSummarized]);

  useEffect(() => {
    // Same origin by default: in dev the Vite server proxies /socket.io to
    // the local backend, in production the backend serves the app.
    const socket = io(import.meta.env.REACT_APP_SOCKET_URL || undefined);
    socket.emit("joinProductRoom", id);

    const handleProductUpdate = (updatedProduct) => {
      toast.info("This product's details have been updated!");
      dispatch({ type: REALTIME_PRODUCT_UPDATE, payload: updatedProduct });
    };
    const handleReviewUpdate = () => {
      toast.info("A new review has been posted!");
      dispatch(getProductDetails(id));
    };
    const handleSummaryUpdate = () => {
      toast.info("An AI summary has been generated for this product!");
      dispatch(getProductDetails(id));
    };

    socket.on("productUpdate", handleProductUpdate);
    socket.on("reviewUpdate", handleReviewUpdate);
    socket.on("summaryUpdate", handleSummaryUpdate);

    return () => {
      socket.emit("leaveProductRoom", id);
      socket.off("productUpdate", handleProductUpdate);
      socket.off("reviewUpdate", handleReviewUpdate);
      socket.off("summaryUpdate", handleSummaryUpdate);
      socket.disconnect();
    };
  }, [dispatch, id]);

  // With options, stock and price follow the chosen combination.
  const inStock = selectedVariant ? selectedVariant.Stock >= 1 : product?.Stock >= 1;
  const unitsLeft = selectedVariant ? selectedVariant.Stock : product?.Stock;
  const shownPrice = selectedVariant
    ? (selectedVariant.price ?? product.price)
    : product?.priceFrom != null && product?.priceTo != null && product.priceFrom !== product.priceTo
      ? null
      : (product?.priceFrom ?? product?.price);

  // What the buy controls can do right now.
  const optionsComplete = !hasOptions || Boolean(selectedVariant);
  const canBuy = optionsComplete ? inStock : product?.Stock >= 1;
  const status = !product?._id
    ? null
    : optionsComplete
      ? inStock
        ? unitsLeft <= 3
          ? { text: `Only ${unitsLeft} left`, tone: "text-brass" }
          : { text: "In stock", tone: "text-success" }
        : { text: hasOptions ? "This option is sold out" : "Sold out", tone: "text-danger" }
      : product.Stock < 1
        ? { text: "Sold out", tone: "text-danger" }
        : null;
  const showNotify = backInStockOn && !canBuy;
  const priceText = product?._id
    ? shownPrice != null ? formatINR(shownPrice) : `From ${formatINR(product.priceFrom)}`
    : "";
  const priceCaption = selectedVariant
    ? Object.values(selection).filter(Boolean).join(" · ")
    : hasOptions && shownPrice == null
      ? `Price depends on ${product.options.filter((o) => !selection[o.name]).map((o) => o.name.toLowerCase()).join(" and ") || "your choice"}`
      : "";
  const reviewCount = product?.reviews?.length || 0;

  const primaryAction = (className = "") =>
    lockedForMe ? (
      <Link to="/membership" className={`btn-solid text-center ${className}`}>
        Join Plus to buy now
      </Link>
    ) : (
      <button type="button" onClick={addToCartHandler} className={`btn-solid ${className}`}>
        Add to bag
      </button>
    );

  return (
    <Fragment>
      {loading || !product?._id ? (
        <Fragment>
          <LoadingBar
            color="#A07C4B"
            progress={progress}
            onLoaderFinished={onLoaderFinished}
          />
          <Loader label="Bringing out this piece" />
        </Fragment>
      ) : (
        <Fragment>
          <MetaData
            title={product?.metaTitle || `${product?.name} · Maison`}
            description={product?.metaDescription || cleanText(product?.description)}
            image={product?.images?.[0]?.url}
            type="product"
          />
          <ProductJsonLd product={product} />

          <div className="editorial-shell pb-14 sm:pt-10">
            <div className="hidden sm:block">
              <Breadcrumbs product={product} />
            </div>
            <div className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14 xl:gap-20">
              {/* Gallery: edge to edge on phones */}
              <div className="-mx-6 sm:mx-0 lg:sticky lg:top-28 lg:self-start">
                <ProductGallery
                  images={galleryImages}
                  alt={chosenColor ? `${product.name} in ${chosenColor}` : product.name}
                  onOpen={openLightbox}
                />
              </div>

              <Lightbox
                open={lightboxIsOpen}
                close={() => setLightboxIsOpen(false)}
                slides={galleryImages.map((item) => ({ src: item.url }))}
                index={lightboxImageIndex}
              />

              {/* Details */}
              <div className="flex flex-col">
                <p className="eyebrow">{product.category || "Maison"}</p>
                <h1 className="heading-display mt-2 text-[2rem] leading-[1.08] sm:text-5xl">
                  {product.name}
                </h1>

                <div className="mt-3 flex items-center gap-2 font-sans text-sm text-ink-faint">
                  {reviewCount > 0 ? (
                    <a href="#reviews" className="flex items-center gap-2 hover:text-ink">
                      <Rating name="product-rating" {...options} size="small" />
                      <span>
                        {Number(product.ratings || 0).toFixed(1)} · {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                      </span>
                    </a>
                  ) : (
                    <span>No reviews yet</span>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="font-display text-[2rem] font-medium leading-none text-ink sm:text-4xl">{priceText}</p>
                  {priceCaption && <p className="font-sans text-sm text-ink-faint">{priceCaption}</p>}
                </div>

                {earlyAccessLive && (
                  <div className="mt-5 border border-brass/50 bg-brass/5 px-4 py-3">
                    <p className="font-sans text-[0.68rem] uppercase tracking-luxe text-brass">Maison Plus early access</p>
                    <p className="mt-1 font-sans text-sm text-ink-soft">
                      {tier === 'plus'
                        ? `You're in early: Plus members can buy this before everyone else, until ${opensLabel}.`
                        : `Plus members can buy this now. It opens to everyone on ${opensLabel}.`}
                    </p>
                  </div>
                )}

                {hasOptions && (
                  <div ref={pickerRef} className="mt-7 scroll-mt-28">
                    <VariantPicker
                      product={product}
                      selection={selection}
                      missing={missing}
                      onChange={chooseOptions}
                    />
                  </div>
                )}

                {status && (
                  <p className={`mt-6 font-sans text-[0.72rem] uppercase tracking-luxe ${status.tone}`}>{status.text}</p>
                )}

                {/* Quantity, buy and wishlist on one row */}
                <div ref={buyRowRef} className={`${status ? "mt-3" : "mt-7"} flex items-stretch gap-2`}>
                  {canBuy && (
                    <div className="flex shrink-0 items-center border border-line bg-surface" role="group" aria-label="Quantity">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        aria-label="One less"
                        className="h-full w-10 font-sans text-lg text-ink-soft hover:text-ink disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="w-7 text-center font-sans text-sm text-ink" aria-live="polite">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(Math.min(10, unitsLeft || 1), q + 1))}
                        disabled={quantity >= Math.min(10, unitsLeft || 1)}
                        aria-label="One more"
                        className="h-full w-10 font-sans text-lg text-ink-soft hover:text-ink disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  )}
                  {canBuy ? (
                    primaryAction("min-h-[52px] flex-1")
                  ) : showNotify ? (
                    <div className="flex-1">
                      <BackInStockButton productId={product._id} isAuthenticated={Boolean(user)} />
                    </div>
                  ) : (
                    <span className="flex min-h-[52px] flex-1 items-center justify-center border border-line font-sans text-[0.72rem] uppercase tracking-luxe text-ink-faint">
                      Sold out
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={wishlistHandler}
                    aria-label={inWishlist ? "In your wishlist" : "Add to wishlist"}
                    aria-pressed={inWishlist}
                    title={inWishlist ? "In your wishlist" : "Add to wishlist"}
                    className="flex min-h-[52px] w-[52px] shrink-0 items-center justify-center border border-line bg-surface text-ink transition-colors hover:border-ink"
                  >
                    {inWishlist ? <FavoriteIcon fontSize="small" className="text-brass" /> : <FavoriteBorderIcon fontSize="small" />}
                  </button>
                </div>

                {canBuy && <DeliveryLine />}

                <Highlights items={product.highlights} />

                <ProductInfo
                  description={cleanText(product.description)}
                  specs={product.specs}
                  productId={product._id}
                />
              </div>
            </div>

            {/* Reviews */}
            <section id="reviews" className="mt-20 scroll-mt-24 sm:mt-24">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">What buyers say</p>
                  <h2 className="heading-display mt-3 text-display">Reviews</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {user &&
                    user.role === "admin" &&
                    product.reviews &&
                    product.reviews.length > 2 && (
                      <Button
                        variant="contained"
                        onClick={generateSummaryHandler}
                        disabled={summaryLoading}
                        startIcon={<AutoAwesomeIcon />}
                        sx={{
                          backgroundColor: "#A07C4B",
                          textTransform: "uppercase",
                          letterSpacing: "0.14em",
                          fontSize: "0.72rem",
                          "&:hover": { backgroundColor: "#8a6a3f" },
                        }}
                      >
                        {summaryLoading ? "Generating…" : "Generate AI Summary"}
                      </Button>
                    )}
                  {reviewsOn && (
                    <button type="button" onClick={submitReviewToggle} className="btn-outline">
                      Write a review
                    </button>
                  )}
                </div>
              </div>

              {reviewCount > 0 && product.aiSummary?.overall && (
                <section className="mb-10 border border-line bg-surface p-6 sm:p-8">
                  <p className="eyebrow flex items-center gap-2">
                    <AutoAwesomeIcon sx={{ fontSize: 14 }} />
                    In short · from {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                  </p>
                  <p className="mt-3 max-w-3xl font-display text-xl leading-snug text-ink sm:text-2xl">
                    {product.aiSummary.overall}
                  </p>
                  {(product.aiSummary.pros?.length > 0 || product.aiSummary.cons?.length > 0) && (
                    <div className="mt-6 grid gap-6 sm:grid-cols-2">
                      {product.aiSummary.pros?.length > 0 && (
                        <div>
                          <p className="font-sans text-[0.68rem] uppercase tracking-luxe text-success">Buyers like</p>
                          <ul className="mt-2 space-y-1.5">
                            {product.aiSummary.pros.map((pro) => (
                              <li key={pro} className="flex gap-2 font-sans text-sm leading-6 text-ink-soft">
                                <span aria-hidden="true" className="text-success">+</span>
                                {pro}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {product.aiSummary.cons?.length > 0 && (
                        <div>
                          <p className="font-sans text-[0.68rem] uppercase tracking-luxe text-danger">Worth knowing</p>
                          <ul className="mt-2 space-y-1.5">
                            {product.aiSummary.cons.map((con) => (
                              <li key={con} className="flex gap-2 font-sans text-sm leading-6 text-ink-soft">
                                <span aria-hidden="true" className="text-danger">−</span>
                                {con}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="mt-6 font-sans text-[0.68rem] text-ink-faint">Summarised by AI from customer reviews.</p>
                </section>
              )}

              <ReviewsSection reviews={product.reviews} />
            </section>

            <RelatedProducts productId={product._id} />
            <RecentlyViewed product={product} />

            {/* Room for the pinned buy bar on phones */}
            <div aria-hidden="true" className="h-20 lg:hidden" />
          </div>

          {/* Phones: price and Add to bag stay in reach while the main button is off screen */}
          {showBuyBar && canBuy && (
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
              <div className="mx-auto flex max-w-xl items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl leading-tight text-ink">{priceText}</p>
                  {priceCaption && <p className="truncate font-sans text-[0.7rem] text-ink-faint">{priceCaption}</p>}
                </div>
                {primaryAction("min-h-[48px] w-[11.5rem] shrink-0 !px-4")}
              </div>
            </div>
          )}

          <Dialog
            aria-labelledby="review-dialog"
            open={open}
            onClose={submitReviewToggle}
            PaperProps={{ sx: { backgroundColor: "#FBF9F4" } }}
          >
            <DialogTitle
              sx={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "1.6rem",
              }}
            >
              Write a review
            </DialogTitle>
            <DialogContent
              className="flex flex-col gap-4"
              sx={{ minWidth: 320 }}
            >
              <Rating
                onChange={(e) => setRating(e.target.value)}
                value={Number(rating)}
                size="large"
              />
              <textarea
                cols="30"
                rows="5"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts…"
                className="field-luxe resize-none border border-line p-3"
                style={{ color: "#1A1816" }}
              ></textarea>
            </DialogContent>
            <DialogActions>
              <Button onClick={submitReviewToggle} sx={{ color: "#8A8278" }}>
                Cancel
              </Button>
              <Button onClick={reviewSubmitHandler} sx={{ color: "#A07C4B" }}>
                Submit
              </Button>
            </DialogActions>
          </Dialog>
        </Fragment>
      )}
    </Fragment>
  );
};

export default ProductDetails;
