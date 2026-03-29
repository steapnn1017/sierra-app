import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import { ChevronLeft, ChevronRight, ShoppingBag, Menu, X, MessageCircle, Send, Minus, Plus, Trash2, WifiOff } from "lucide-react";
import offlineStorage from "./offlineStorage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
// Generate session ID for cart
const getSessionId = () => {
  let sessionId = localStorage.getItem('cart_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('cart_session_id', sessionId);
  }
  return sessionId;
};

// Header Component
const Header = ({ cartCount = 0, onMenuClick }) => {
  const navigate = useNavigate();
  
  return (
    <header className="header" data-testid="header">
      <button className="header-btn" onClick={onMenuClick} data-testid="menu-btn">
        <Menu size={22} />
      </button>
      <Link to="/" className="logo" data-testid="logo">SIERRA 97 SX</Link>
      <button className="header-btn cart-btn" onClick={() => navigate('/cart')} data-testid="cart-btn">
        <ShoppingBag size={20} />
        {cartCount > 0 && <span className="cart-badge" data-testid="cart-badge">{cartCount}</span>}
      </button>
    </header>
  );
};

// Mobile Menu
const MobileMenu = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  
  const handleNavigation = (path) => {
    navigate(path);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="mobile-menu-overlay" onClick={onClose} data-testid="mobile-menu-overlay">
      <div className="mobile-menu" onClick={e => e.stopPropagation()} data-testid="mobile-menu">
        <div className="mobile-menu-header">
          <span className="mobile-menu-logo">SIERRA 97 SX</span>
          <button onClick={onClose} data-testid="close-menu-btn"><X size={24} /></button>
        </div>
        <nav className="mobile-menu-nav">
          <button onClick={() => handleNavigation('/')} data-testid="nav-home">Home</button>
          <button onClick={() => handleNavigation('/shop')} data-testid="nav-shop">Shop</button>
          <button onClick={() => handleNavigation('/cart')} data-testid="nav-cart">Cart</button>
          <button onClick={() => handleNavigation('/admin')} data-testid="nav-admin">Admin</button>
        </nav>
      </div>
    </div>
  );
};

// Image Gallery Component with arrows
const ImageGallery = ({ images, productName }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const goToPrevious = (e) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };
  
  const goToNext = (e) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };
  
  if (!images || images.length === 0) {
    return <div className="gallery-placeholder">No image</div>;
  }
  
  return (
    <div className="image-gallery" data-testid="image-gallery">
      <div className="gallery-image-container">
        <img 
          src={images[currentIndex]} 
          alt={`${productName} - ${currentIndex + 1}`} 
          className="gallery-image"
          data-testid="gallery-image"
        />
        {images.length > 1 && (
          <>
            <button 
              className="gallery-arrow gallery-arrow-left" 
              onClick={goToPrevious}
              data-testid="gallery-prev-btn"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              className="gallery-arrow gallery-arrow-right" 
              onClick={goToNext}
              data-testid="gallery-next-btn"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="gallery-indicators" data-testid="gallery-indicators">
          {images.map((_, idx) => (
            <button 
              key={idx}
              className={`gallery-dot ${idx === currentIndex ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
              data-testid={`gallery-dot-${idx}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// AI Chatbot Component
const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Ahoj! Jsem tvůj pomocník pro SIERRA 97 SX. Jak ti mohu pomoci s výběrem oblečení?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const sessionId = getSessionId();
  
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API}/chat`, {
        session_id: sessionId,
        message: userMessage
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Omlouvám se, něco se pokazilo. Zkus to znovu.' }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  return (
    <>
      <button 
        className="chatbot-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        data-testid="chatbot-trigger"
      >
        <MessageCircle size={24} />
      </button>
      
      {isOpen && (
        <div className="chatbot-window" data-testid="chatbot-window">
          <div className="chatbot-header">
            <span>AI Asistent</span>
            <button onClick={() => setIsOpen(false)} data-testid="close-chat-btn">
              <X size={20} />
            </button>
          </div>
          <div className="chatbot-messages" data-testid="chatbot-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role}`} data-testid={`chat-message-${idx}`}>
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="chat-message assistant loading">
                <span className="typing-indicator">...</span>
              </div>
            )}
          </div>
          <div className="chatbot-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Napiš zprávu..."
              disabled={isLoading}
              data-testid="chat-input"
            />
            <button onClick={sendMessage} disabled={isLoading} data-testid="send-message-btn">
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// Product Card Component
const ProductCard = ({ product, onClick }) => {
  const images = product.images?.length > 0 ? product.images : 
    (product.image ? [product.image] : ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400']);
  
  return (
    <div className="product-card" onClick={onClick} data-testid={`product-card-${product.id}`}>
      <div className="product-card-image">
        <ImageGallery images={images} productName={product.name} />
      </div>
      <div className="product-card-info">
        <h3 className="product-card-name" data-testid="product-name">{product.name}</h3>
        <p className="product-card-price" data-testid="product-price">${product.price.toFixed(2)}</p>
      </div>
    </div>
  );
};

// Home Page
const Home = ({ cartCount, onMenuClick }) => {
  const navigate = useNavigate();
  
  return (
    <div className="page-container" data-testid="home-page">
      <Header cartCount={cartCount} onMenuClick={onMenuClick} />
      
      <main className="home-content">
        <section className="hero-section" data-testid="hero-section">
          <div className="hero-image-container">
            <img 
              src="https://images.complex.com/complex/image/upload/v1730951310/CS_BrandArtist_Desktop_Destroy_Lonely_21x9.png" 
              alt="SIERRA 97 SX"
              className="hero-image"
            />
          </div>
        </section>
        
        <section className="cta-section">
          <button 
            className="shop-now-btn" 
            onClick={() => navigate('/shop')}
            data-testid="shop-now-btn"
          >
            SHOP NOW
          </button>
        </section>
        
        <section className="philosophy-section" data-testid="philosophy-section">
          <div className="divider"></div>
          <blockquote className="philosophy-quote">
            "We don't follow trends.<br/>We exist outside of time."
          </blockquote>
          <p className="philosophy-text">
            SIERRA 97 SX is more than clothing. It's a statement of individuality 
            in a world of conformity. Born from the streets, crafted for those 
            who refuse to blend in.
          </p>
          <p className="philosophy-tagline">Wear your truth.</p>
        </section>
        
        <footer className="footer" data-testid="footer">
          <span className="footer-logo">SIERRA 97 SX</span>
          <div className="footer-links">
            <Link to="/shop">Shop</Link>
            <span>·</span>
            <Link to="/cart">Cart</Link>
            <span>·</span>
            <Link to="/admin">Admin</Link>
          </div>
          <p className="footer-copy">© 2026 SIERRA 97 SX. All rights reserved.</p>
          <p className="footer-tagline">EST. 1997 — Prague, CZ</p>
        </footer>
      </main>
    </div>
  );
};

// Shop Page
const Shop = ({ cartCount, onMenuClick }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const navigate = useNavigate();
  
  const categories = ['All', 'Hoodies', 'T-Shirts', 'Pants', 'Jackets'];
  
  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  useEffect(() => {
    fetchProducts();
  }, []);
  
  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
      // Save to localStorage for offline use
      offlineStorage.saveProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      // Try to load from offline cache
      const cachedProducts = offlineStorage.getProducts();
      if (cachedProducts) {
        setProducts(cachedProducts);
        console.log('Loaded products from offline cache');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const filteredProducts = selectedCategory === 'All' 
    ? products 
    : products.filter(p => p.category === selectedCategory);
  
  return (
    <div className="page-container" data-testid="shop-page">
      <Header cartCount={cartCount} onMenuClick={onMenuClick} />
      
      {isOffline && (
        <div className="offline-banner" data-testid="offline-banner">
          <WifiOff size={16} />
          <span>Jsi offline - prohlížíš uložené produkty</span>
        </div>
      )}
      
      <div className="category-filter" data-testid="category-filter">
        {categories.map(cat => (
          <button
            key={cat}
            className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
            data-testid={`category-${cat.toLowerCase()}`}
          >
            {cat}
          </button>
        ))}
      </div>
      
      <main className="shop-content">
        {loading ? (
          <div className="loading-container" data-testid="loading">
            <div className="spinner"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-container" data-testid="empty-products">
            <p>No products found</p>
          </div>
        ) : (
          <div className="products-grid" data-testid="products-grid">
            {filteredProducts.map(product => (
              <ProductCard 
                key={product.id} 
                product={product}
                onClick={() => navigate(`/product/${product.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

// Product Detail Page
const ProductDetail = ({ cartCount, onMenuClick, onAddToCart }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [adding, setAdding] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  useEffect(() => {
    fetchProduct();
  }, [id]);
  
  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${API}/products/${id}`);
      setProduct(response.data);
      if (response.data.sizes?.length > 0) setSelectedSize(response.data.sizes[0]);
      if (response.data.colors?.length > 0) setSelectedColor(response.data.colors[0]);
    } catch (error) {
      console.error('Failed to fetch product:', error);
      // Try to load from offline cache
      const cachedProduct = offlineStorage.getProductById(id);
      if (cachedProduct) {
        setProduct(cachedProduct);
        if (cachedProduct.sizes?.length > 0) setSelectedSize(cachedProduct.sizes[0]);
        if (cachedProduct.colors?.length > 0) setSelectedColor(cachedProduct.colors[0]);
        console.log('Loaded product from offline cache');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddToCart = async () => {
    if (!selectedSize || !selectedColor) return;
    
    setAdding(true);
    await onAddToCart({
      product_id: product.id,
      quantity: 1,
      size: selectedSize,
      color: selectedColor
    });
    setAdding(false);
    
    if (window.confirm('Added to cart! View cart?')) {
      navigate('/cart');
    }
  };
  
  if (loading) {
    return (
      <div className="page-container" data-testid="product-detail-loading">
        <Header cartCount={cartCount} onMenuClick={onMenuClick} />
        <div className="loading-container"><div className="spinner"></div></div>
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="page-container" data-testid="product-not-found">
        <Header cartCount={cartCount} onMenuClick={onMenuClick} />
        <div className="empty-container"><p>Product not found</p></div>
      </div>
    );
  }
  
  const images = product.images?.length > 0 ? product.images : 
    (product.image ? [product.image] : ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800']);
  
  return (
    <div className="page-container" data-testid="product-detail-page">
      <Header cartCount={cartCount} onMenuClick={onMenuClick} />
      
      <button className="back-btn" onClick={() => navigate(-1)} data-testid="back-btn">
        <ChevronLeft size={20} /> Back
      </button>
      
      <main className="product-detail-content">
        <div className="product-detail-gallery" data-testid="product-detail-gallery">
          <ImageGallery images={images} productName={product.name} />
        </div>
        
        <div className="product-detail-info">
          <h1 className="product-detail-name" data-testid="product-detail-name">{product.name}</h1>
          <p className="product-detail-price" data-testid="product-detail-price">${product.price.toFixed(2)}</p>
          
          <div className="option-section">
            <label className="option-label">Size</label>
            <div className="option-buttons" data-testid="size-options">
              {product.sizes.map(size => (
                <button
                  key={size}
                  className={`option-btn ${selectedSize === size ? 'active' : ''}`}
                  onClick={() => setSelectedSize(size)}
                  data-testid={`size-${size}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          
          <div className="option-section">
            <label className="option-label">Color</label>
            <div className="option-buttons" data-testid="color-options">
              {product.colors.map(color => (
                <button
                  key={color}
                  className={`option-btn ${selectedColor === color ? 'active' : ''}`}
                  onClick={() => setSelectedColor(color)}
                  data-testid={`color-${color}`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
          
          <div className="description-section">
            <p className="product-description" data-testid="product-description">{product.description}</p>
          </div>
          
          <button 
            className="add-to-cart-btn" 
            onClick={handleAddToCart}
            disabled={adding}
            data-testid="add-to-cart-btn"
          >
            {adding ? 'Adding...' : 'Add to Cart'}
          </button>
        </div>
      </main>
    </div>
  );
};

// Cart Page
const Cart = ({ cartCount, onMenuClick, cartItems, cartTotal, onUpdateQuantity, onRemoveItem }) => {
  const navigate = useNavigate();
  
  return (
    <div className="page-container" data-testid="cart-page">
      <Header cartCount={cartCount} onMenuClick={onMenuClick} />
      
      <button className="back-btn" onClick={() => navigate(-1)} data-testid="back-btn">
        <ChevronLeft size={20} /> Back
      </button>
      
      <main className="cart-content">
        <h1 className="cart-title" data-testid="cart-title">Shopping Cart</h1>
        
        {cartItems.length === 0 ? (
          <div className="empty-cart" data-testid="empty-cart">
            <p>Your cart is empty</p>
            <button className="browse-btn" onClick={() => navigate('/shop')} data-testid="browse-btn">
              Browse Products
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items" data-testid="cart-items">
              {cartItems.map((item, idx) => (
                <div key={`${item.product_id}-${item.size}-${item.color}`} className="cart-item" data-testid={`cart-item-${idx}`}>
                  <div className="cart-item-image">
                    <img 
                      src={item.product?.images?.[0] || item.product?.image || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200'} 
                      alt={item.product?.name}
                    />
                  </div>
                  <div className="cart-item-details">
                    <h3 data-testid="cart-item-name">{item.product?.name}</h3>
                    <p className="cart-item-variant">{item.size} / {item.color}</p>
                    <p className="cart-item-price" data-testid="cart-item-price">${item.product?.price?.toFixed(2)}</p>
                    
                    <div className="cart-item-actions">
                      <div className="quantity-controls" data-testid="quantity-controls">
                        <button 
                          onClick={() => onUpdateQuantity(item.product_id, item.size, item.color, item.quantity - 1)}
                          data-testid="decrease-qty-btn"
                        >
                          <Minus size={14} />
                        </button>
                        <span data-testid="item-quantity">{item.quantity}</span>
                        <button 
                          onClick={() => onUpdateQuantity(item.product_id, item.size, item.color, item.quantity + 1)}
                          data-testid="increase-qty-btn"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button 
                        className="remove-btn" 
                        onClick={() => onRemoveItem(item.product_id, item.size, item.color)}
                        data-testid="remove-item-btn"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="cart-summary" data-testid="cart-summary">
              <div className="cart-total">
                <span>Total</span>
                <span data-testid="cart-total">${cartTotal.toFixed(2)}</span>
              </div>
              <button className="checkout-btn" data-testid="checkout-btn">
                Checkout
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

// Admin Page
const Admin = ({ onMenuClick }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', price: '', category: 'T-Shirts',
    sizes: 'S,M,L,XL', colors: 'Black,White', images: []
  });
  const navigate = useNavigate();
  
  const categories = ['Hoodies', 'T-Shirts', 'Pants', 'Jackets'];
  
  useEffect(() => {
    const auth = localStorage.getItem('admin_logged_in');
    if (auth === 'true') {
      setIsLoggedIn(true);
      fetchProducts();
    }
  }, []);
  
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogin = () => {
    if (credentials.username === 'admin' && credentials.password === 'admin1017') {
      localStorage.setItem('admin_logged_in', 'true');
      setIsLoggedIn(true);
      fetchProducts();
    } else {
      setError('Invalid credentials');
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('admin_logged_in');
    setIsLoggedIn(false);
  };
  
  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setForm({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        category: product.category,
        sizes: product.sizes.join(','),
        colors: product.colors.join(','),
        images: product.images || []
      });
    } else {
      setEditingProduct(null);
      setForm({
        name: '', description: '', price: '', category: 'T-Shirts',
        sizes: 'S,M,L,XL', colors: 'Black,White', images: []
      });
    }
    setShowModal(true);
  };
  
  const handleSave = async () => {
    if (!form.name || !form.description || !form.price) {
      alert('Vyplňte prosím všechna povinná pole (název, popis, cena)');
      return;
    }
    
    const productData = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      category: form.category,
      sizes: form.sizes.split(',').map(s => s.trim()).filter(Boolean),
      colors: form.colors.split(',').map(c => c.trim()).filter(Boolean),
      images: form.images
    };
    
    try {
      if (editingProduct) {
        await axios.put(`${API}/products/${editingProduct.id}`, productData);
      } else {
        await axios.post(`${API}/products`, productData);
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      console.error('Save error:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Nepodařilo se uložit produkt';
      alert(`Chyba: ${errorMessage}`);
    }
  };
  
  const handleDelete = async (productId) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await axios.delete(`${API}/products/${productId}`);
      fetchProducts();
    } catch (err) {
      alert('Failed to delete product');
    }
  };
  
  const handleImageUrlAdd = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      setForm(prev => ({ ...prev, images: [...prev.images, url] }));
    }
  };
  
  const handleSeedDatabase = async () => {
    if (!window.confirm('This will reset all products. Continue?')) return;
    try {
      await axios.post(`${API}/seed`);
      fetchProducts();
      alert('Database seeded successfully!');
    } catch (err) {
      alert('Failed to seed database');
    }
  };
  
  if (!isLoggedIn) {
    return (
      <div className="page-container admin-login-page" data-testid="admin-login-page">
        <button className="back-btn" onClick={() => navigate('/')} data-testid="back-btn">
          <ChevronLeft size={20} /> Back
        </button>
        
        <div className="admin-login-container">
          <h1>Admin Panel</h1>
          <p className="login-subtitle">Enter your credentials</p>
          
          {error && <p className="login-error" data-testid="login-error">{error}</p>}
          
          <div className="login-form">
            <div className="input-group">
              <label>Username</label>
              <input
                type="text"
                value={credentials.username}
                onChange={e => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Username"
                data-testid="admin-username-input"
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                value={credentials.password}
                onChange={e => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Password"
                data-testid="admin-password-input"
              />
            </div>
            <button className="login-btn" onClick={handleLogin} data-testid="admin-login-btn">
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="page-container admin-page" data-testid="admin-page">
      <header className="admin-header">
        <button className="back-btn" onClick={() => navigate('/')} data-testid="back-btn">
          <ChevronLeft size={20} />
        </button>
        <span className="admin-title">Admin Panel</span>
        <button className="logout-btn" onClick={handleLogout} data-testid="logout-btn">Logout</button>
      </header>
      
      <div className="admin-actions">
        <button className="add-product-btn" onClick={() => openModal()} data-testid="add-product-btn">
          + Add Product
        </button>
        <button className="seed-btn" onClick={handleSeedDatabase} data-testid="seed-btn">
          Seed Database
        </button>
      </div>
      
      <main className="admin-content">
        {loading ? (
          <div className="loading-container"><div className="spinner"></div></div>
        ) : (
          <div className="admin-products-list" data-testid="admin-products-list">
            {products.map(product => (
              <div key={product.id} className="admin-product-item" data-testid={`admin-product-${product.id}`}>
                <div className="admin-product-image">
                  <img src={product.images?.[0] || product.image || 'https://via.placeholder.com/60'} alt={product.name} />
                  {product.images?.length > 1 && (
                    <span className="image-count">{product.images.length}</span>
                  )}
                </div>
                <div className="admin-product-info">
                  <h3>{product.name}</h3>
                  <p className="admin-product-category">{product.category}</p>
                  <p className="admin-product-price">${product.price.toFixed(2)}</p>
                </div>
                <div className="admin-product-actions">
                  <button onClick={() => openModal(product)} data-testid={`edit-${product.id}`}>Edit</button>
                  <button className="delete-btn" onClick={() => handleDelete(product.id)} data-testid={`delete-${product.id}`}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} data-testid="product-modal">
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <button onClick={() => setShowModal(false)}>Cancel</button>
              <span>{editingProduct ? 'Edit Product' : 'New Product'}</span>
              <button onClick={handleSave} data-testid="save-product-btn">Save</button>
            </div>
            
            <div className="modal-body">
              <div className="images-section">
                <label>Images</label>
                <div className="images-row">
                  {form.images.map((img, idx) => (
                    <div key={idx} className="image-thumb">
                      <img src={img} alt={`Product ${idx + 1}`} />
                      <button 
                        className="remove-image-btn"
                        onClick={() => setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                      >×</button>
                    </div>
                  ))}
                  <button className="add-image-btn" onClick={handleImageUrlAdd}>+</button>
                </div>
              </div>
              
              <div className="form-group">
                <label>Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Product name"
                  data-testid="product-name-input"
                />
              </div>
              
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description"
                  rows={4}
                  data-testid="product-description-input"
                />
              </div>
              
              <div className="form-group">
                <label>Price *</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                  data-testid="product-price-input"
                />
              </div>
              
              <div className="form-group">
                <label>Category</label>
                <div className="category-buttons">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      className={`category-select-btn ${form.category === cat ? 'active' : ''}`}
                      onClick={() => setForm(prev => ({ ...prev, category: cat }))}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="form-group">
                <label>Sizes (comma separated)</label>
                <input
                  value={form.sizes}
                  onChange={e => setForm(prev => ({ ...prev, sizes: e.target.value }))}
                  placeholder="S,M,L,XL"
                />
              </div>
              
              <div className="form-group">
                <label>Colors (comma separated)</label>
                <input
                  value={form.colors}
                  onChange={e => setForm(prev => ({ ...prev, colors: e.target.value }))}
                  placeholder="Black,White"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main App
function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const sessionId = getSessionId();
  
  useEffect(() => {
    fetchCart();
  }, []);
  
  const fetchCart = async () => {
    try {
      const response = await axios.get(`${API}/cart/${sessionId}`);
      setCartItems(response.data.items || []);
      setCartTotal(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    }
  };
  
  const addToCart = async (item) => {
    const existingIndex = cartItems.findIndex(
      i => i.product_id === item.product_id && i.size === item.size && i.color === item.color
    );
    
    let updatedItems;
    if (existingIndex >= 0) {
      updatedItems = cartItems.map((i, idx) => 
        idx === existingIndex ? { ...i, quantity: i.quantity + item.quantity } : i
      );
    } else {
      updatedItems = [...cartItems, item];
    }
    
    try {
      const response = await axios.post(`${API}/cart/${sessionId}`, {
        items: updatedItems.map(({ product_id, quantity, size, color }) => ({ product_id, quantity, size, color }))
      });
      setCartItems(response.data.items || []);
      setCartTotal(response.data.total || 0);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };
  
  const updateQuantity = async (productId, size, color, quantity) => {
    if (quantity < 1) {
      removeItem(productId, size, color);
      return;
    }
    
    const updatedItems = cartItems.map(item => 
      (item.product_id === productId && item.size === size && item.color === color)
        ? { ...item, quantity }
        : item
    );
    
    try {
      const response = await axios.post(`${API}/cart/${sessionId}`, {
        items: updatedItems.map(({ product_id, quantity, size, color }) => ({ product_id, quantity, size, color }))
      });
      setCartItems(response.data.items || []);
      setCartTotal(response.data.total || 0);
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };
  
  const removeItem = async (productId, size, color) => {
    const updatedItems = cartItems.filter(item => 
      !(item.product_id === productId && item.size === size && item.color === color)
    );
    
    try {
      const response = await axios.post(`${API}/cart/${sessionId}`, {
        items: updatedItems.map(({ product_id, quantity, size, color }) => ({ product_id, quantity, size, color }))
      });
      setCartItems(response.data.items || []);
      setCartTotal(response.data.total || 0);
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };
  
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  return (
    <div className="App">
      <BrowserRouter>
        <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <ChatBot />
        <Routes>
          <Route path="/" element={<Home cartCount={cartCount} onMenuClick={() => setMenuOpen(true)} />} />
          <Route path="/shop" element={<Shop cartCount={cartCount} onMenuClick={() => setMenuOpen(true)} />} />
          <Route path="/product/:id" element={
            <ProductDetail 
              cartCount={cartCount} 
              onMenuClick={() => setMenuOpen(true)} 
              onAddToCart={addToCart}
            />
          } />
          <Route path="/cart" element={
            <Cart 
              cartCount={cartCount} 
              onMenuClick={() => setMenuOpen(true)}
              cartItems={cartItems}
              cartTotal={cartTotal}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
            />
          } />
          <Route path="/admin" element={<Admin onMenuClick={() => setMenuOpen(true)} />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
