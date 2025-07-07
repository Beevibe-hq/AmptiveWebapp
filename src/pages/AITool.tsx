import React, { useState } from 'react';
import { Upload, Wand2, Download, RefreshCw, Sparkles, Image as ImageIcon } from 'lucide-react';

const AITool = () => {
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventType, setEventType] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);

  const eventTypes = [
    'Concert',
    'Conference',
    'Workshop',
    'Festival',
    'Networking',
    'Art Show',
    'Comedy Show',
    'Tech Talk',
  ];

  const sampleGeneratedImages = [
    'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
    'https://images.pexels.com/photos/2004161/pexels-photo-2004161.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
    'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
    'https://images.pexels.com/photos/1269968/pexels-photo-1269968.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=2',
  ];

  const handleGenerate = async () => {
    if (!eventTitle || !eventDescription || !eventType) return;
    
    setIsGenerating(true);
    // Simulate API call
    setTimeout(() => {
      setGeneratedImages(sampleGeneratedImages);
      setIsGenerating(false);
    }, 3000);
  };

  const handleDownload = (imageUrl, index) => {
    // In a real app, this would download the actual image
    console.log(`Downloading image ${index + 1}: ${imageUrl}`);
  };

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-r from-primary-600 to-electric-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Wand2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            AI Cover Photo Generator
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Create stunning cover photos for your events using our AI-powered generator. 
            Just describe your event and let AI create multiple professional options.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Form Section */}
          <div className="bg-white p-8 rounded-2xl shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Event Details</h2>
            
            <div className="space-y-6">
              {/* Event Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g., Electronic Music Festival 2025"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Type *
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select event type</option>
                  {eventTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Event Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Description *
                </label>
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Describe your event, atmosphere, target audience, and any specific visual elements you want to include..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Additional Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color Scheme
                  </label>
                  <select className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    <option value="">Auto (Recommended)</option>
                    <option value="vibrant">Vibrant & Colorful</option>
                    <option value="dark">Dark & Moody</option>
                    <option value="light">Light & Airy</option>
                    <option value="neon">Neon & Electric</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Style
                  </label>
                  <select className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    <option value="">Modern (Recommended)</option>
                    <option value="minimalist">Minimalist</option>
                    <option value="abstract">Abstract</option>
                    <option value="photographic">Photographic</option>
                    <option value="illustrated">Illustrated</option>
                  </select>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!eventTitle || !eventDescription || !eventType || isGenerating}
                className="w-full bg-gradient-to-r from-primary-600 to-electric-500 text-white py-4 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate Cover Photos</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Section */}
          <div className="bg-white p-8 rounded-2xl shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Generated Results</h2>
            
            {generatedImages.length === 0 && !isGenerating && (
              <div className="text-center py-12">
                <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No images generated yet</h3>
                <p className="text-gray-600">Fill out the event details and click generate to create your cover photos.</p>
              </div>
            )}

            {isGenerating && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-primary-600 to-electric-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Wand2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Creating your cover photos...</h3>
                <p className="text-gray-600">Our AI is analyzing your event details and generating custom designs.</p>
                <div className="mt-6 w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-primary-600 to-electric-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            )}

            {generatedImages.length > 0 && (
              <div className="space-y-6">
                <p className="text-gray-600">Choose your favorite design or download multiple options:</p>
                <div className="grid grid-cols-2 gap-4">
                  {generatedImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Generated cover ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <button
                          onClick={() => handleDownload(image, index)}
                          className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center space-x-2"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex space-x-4">
                  <button className="flex-1 bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors">
                    Use Selected Design
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Generate More</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16 bg-white p-8 rounded-2xl shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            AI Generator Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-600 to-electric-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">Smart AI Analysis</h3>
              <p className="text-gray-600">Our AI understands your event context and creates designs that match your vision perfectly.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-600 to-electric-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">Multiple Variations</h3>
              <p className="text-gray-600">Generate multiple design options to choose from, each with unique styles and compositions.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-600 to-electric-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Download className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">High-Quality Output</h3>
              <p className="text-gray-600">Download professional-quality images ready for use across all your marketing channels.</p>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-gradient-to-r from-primary-600 to-electric-600 text-white p-8 rounded-2xl">
          <h3 className="text-xl font-bold mb-4">Tips for Better Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Be Descriptive</h4>
              <p className="text-white/90 text-sm">Include details about the atmosphere, target audience, and visual elements you want.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Specify Style Preferences</h4>
              <p className="text-white/90 text-sm">Mention if you prefer modern, vintage, minimalist, or any specific aesthetic.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Include Color Preferences</h4>
              <p className="text-white/90 text-sm">Mention specific colors or color schemes that align with your brand.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Consider Your Audience</h4>
              <p className="text-white/90 text-sm">Describe who will be attending to help AI create appropriate designs.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITool;