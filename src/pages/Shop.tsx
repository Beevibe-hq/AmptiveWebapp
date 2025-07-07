import React, { useState } from 'react';
import { Search, Filter, Star, ShoppingCart, Badge, Headphones, Mic, Speaker } from 'lucide-react';

const Shop = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Products', icon: ShoppingCart },
    { id: 'headphones', name: 'Headphones', icon: Headphones },
    { id: 'microphones', name: 'Microphones', icon: Mic },
    { id: 'speakers', name: 'Speakers', icon: Speaker },
  ];

  const products = [
    {
      id: 1,
      name: 'Sony WH-1000XM5 Headphones',
      brand: 'Sony',
      category: 'headphones',
      price: 399.99,
      originalPrice: 449.99,
      rating: 4.8,
      reviews: 2847,
      image: 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=2',
      partner: true,
      features: ['Active Noise Cancellation', '30hr Battery', 'Quick Charge'],
      description: 'Industry-leading noise cancellation with premium sound quality.',
    },
    {
      id: 2,
      name: 'Audio-Technica AT2020',
      brand: 'Audio-Technica',
      category: 'microphones',
      price: 149.99,
      originalPrice: 169.99,
      rating: 4.7,
      reviews: 1523,
      image: 'https://images.pexels.com/photos/4196699/pexels-photo-4196699.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=2',
      partner: true,
      features: ['Cardioid Pattern', 'Studio Quality', 'Low Noise'],
      description: 'Professional cardioid condenser microphone for studio recording.',
    },
    {
      id: 3,
      name: 'JBL Charge 5 Speaker',
      brand: 'JBL',
      category: 'speakers',
      price: 179.99,
      originalPrice: 199.99,
      rating: 4.6,
      reviews: 3241,
      image: 'https://images.pexels.com/photos/6686445/pexels-photo-6686445.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=2',
      partner: true,
      features: ['Waterproof', '20hr Battery', 'Power Bank'],
      description: 'Portable Bluetooth speaker with powerful bass and long battery life.',
    },
    {
      id: 4,
      name: 'Beyerdynamic DT 770 Pro',
      brand: 'Beyerdynamic',
      category: 'headphones',
      price: 159.99,
      originalPrice: 179.99,
      rating: 4.9,
      reviews: 892,
      image: 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=2',
      partner: true,
      features: ['Studio Reference', 'Closed Back', 'Professional'],
      description: 'Studio reference headphones for professional audio production.',
    },
    {
      id: 5,
      name: 'Shure SM58 Microphone',
      brand: 'Shure',
      category: 'microphones',
      price: 99.99,
      originalPrice: 119.99,
      rating: 4.8,
      reviews: 4567,
      image: 'https://images.pexels.com/photos/4196699/pexels-photo-4196699.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=2',
      partner: true,
      features: ['Dynamic', 'Legendary Durability', 'Live Performance'],
      description: 'The legendary vocal microphone for live performance.',
    },
    {
      id: 6,
      name: 'Bose SoundLink Revolve+',
      brand: 'Bose',
      category: 'speakers',
      price: 299.99,
      originalPrice: 329.99,
      rating: 4.5,
      reviews: 1876,
      image: 'https://images.pexels.com/photos/6686445/pexels-photo-6686445.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=2',
      partner: true,
      features: ['360° Sound', '16hr Battery', 'Water Resistant'],
      description: '360-degree Bluetooth speaker with deep bass and impressive volume.',
    },
  ];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Amptive Audio Shop
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Curated audio equipment from verified Amptive partners. 
            Get professional-grade gear to elevate your creative projects.
          </p>
        </div>

        {/* Search and Categories */}
        <div className="bg-white p-6 rounded-2xl shadow-sm mb-8">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products, brands, or features..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  selectedCategory === category.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <category.icon className="w-5 h-5" />
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Partner Badge Info */}
        <div className="bg-gradient-to-r from-primary-600 to-electric-600 text-white p-6 rounded-2xl mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Badge className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">Verified Amptive Partners</h3>
              <p className="text-white/90">
                All products come from verified partners, ensuring authenticity and quality. 
                Enjoy exclusive discounts and priority support.
              </p>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
            >
              <div className="relative">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {product.partner && (
                  <div className="absolute top-4 left-4 bg-gradient-to-r from-primary-600 to-electric-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                    <Badge className="w-3 h-3" />
                    <span>Partner</span>
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium text-gray-900">{product.rating}</span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-gray-600 font-medium">{product.brand}</p>
                </div>

                <p className="text-gray-600 text-sm mb-4">{product.description}</p>

                {/* Features */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {product.features.slice(0, 2).map((feature, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs font-medium"
                      >
                        {feature}
                      </span>
                    ))}
                    {product.features.length > 2 && (
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs font-medium">
                        +{product.features.length - 2} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Rating and Reviews */}
                <div className="flex items-center space-x-2 mb-4">
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">({product.reviews.toLocaleString()} reviews)</span>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-2xl font-bold text-gray-900">${product.price}</span>
                    {product.originalPrice > product.price && (
                      <span className="text-sm text-gray-500 line-through ml-2">${product.originalPrice}</span>
                    )}
                  </div>
                  {product.originalPrice > product.price && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs font-medium">
                      Save ${(product.originalPrice - product.price).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Add to Cart Button */}
                <button className="w-full bg-gradient-to-r from-primary-600 to-electric-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* No Products */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600">Try adjusting your search or browse different categories</p>
          </div>
        )}

        {/* Benefits Section */}
        <div className="mt-16 bg-white p-8 rounded-2xl shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Why Shop with Amptive Partners?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-600 to-electric-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Badge className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">Verified Quality</h3>
              <p className="text-gray-600">All products are sourced from verified partners with guaranteed authenticity.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-600 to-electric-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">Exclusive Discounts</h3>
              <p className="text-gray-600">Enjoy special pricing and exclusive deals only available to Amptive members.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-600 to-electric-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Headphones className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">Creator-Approved</h3>
              <p className="text-gray-600">Products recommended and used by successful creators on our platform.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;