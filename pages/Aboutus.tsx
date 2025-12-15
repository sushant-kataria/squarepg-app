import React from 'react';
import { 
  Home, Wifi, Utensils, Shield, Clock, Sparkles, 
  MapPin, Navigation, Phone, Mail, CheckCircle2,
  Users, Zap, Heart, Tv, Droplet, Wind, Camera,
  BedDouble, BedSingle, Coffee, IndianRupee
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AboutUs: React.FC = () => {
  const navigate = useNavigate();

  // WhatsApp booking function
  const handleBookRoom = (roomType?: string) => {
    const phoneNumber = '919818302465'; // WhatsApp number without + or spaces
    const message = roomType 
      ? `Hi! I'm interested in booking a ${roomType} at AshirwadPG. Can you please provide more details?`
      : `Hi! I'm interested in booking a room at AshirwadPG. Can you please provide more details?`;
    
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Smooth scroll function
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const features = [
    {
      icon: Wifi,
      title: 'High-Speed WiFi',
      description: 'Unlimited high-speed internet included in rent'
    },
    {
      icon: Utensils,
      title: 'Canteen & In-Room Service',
      description: 'Hygienic meals with in-room delivery (₹2000-3000/month extra)'
    },
    {
      icon: Droplet,
      title: 'Geyser & RO Water',
      description: 'Hot water geysers and purified RO drinking water'
    },
    {
      icon: Wind,
      title: 'Cooler',
      description: 'Room cooling facilities for comfortable living'
    },
    {
      icon: Camera,
      title: 'CCTV Surveillance',
      description: '24/7 security monitoring for your safety'
    },
    {
      icon: Tv,
      title: 'Modern LED TV',
      description: 'Entertainment at your fingertips in every room'
    },
    {
      icon: Home,
      title: 'Fully Furnished',
      description: 'Bed, mattress, almirah, and attached bathroom'
    },
    {
      icon: Coffee,
      title: 'Personal Kitchen',
      description: 'Shared rooms come with personal kitchen access'
    }
  ];

  const roomTypes = [
    {
      type: 'Single Room',
      price: '₹6,500',
      period: 'per month',
      icon: BedSingle,
      includes: [
        'Private single occupancy',
        'Attached bathroom',
        'Bed, mattress & almirah',
        'Modern LED TV',
        'WiFi included',
        'Geyser & RO water',
        'CCTV surveillance'
      ],
      images: [
        'https://ashirwadpg.wordpress.com/wp-content/uploads/2017/02/img_3970.jpg',
        'https://ashirwadpg.wordpress.com/wp-content/uploads/2017/02/img_3058.jpg'
      ],
      popular: true
    },
    {
      type: 'Double Sharing Room',
      price: '₹4,500',
      period: 'per bed/month',
      icon: BedDouble,
      includes: [
        'Shared with one person',
        'Personal kitchen access',
        'Attached bathroom',
        'Bed, mattress & almirah',
        'Modern LED TV',
        'WiFi included',
        'Geyser & RO water',
        'CCTV surveillance'
      ],
      images: [
        'https://ashirwadpg.wordpress.com/wp-content/uploads/2017/02/img_3059.jpg',
        'https://ashirwadpg.wordpress.com/wp-content/uploads/2017/02/img_3060.jpg'
      ],
      popular: false
    }
  ];

  const stats = [
    { value: '50+', label: 'Happy Residents' },
    { value: '₹4,500', label: 'Starting From' },
    { value: '4.8', label: 'Average Rating' },
    { value: '24/7', label: 'Support Available' }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollToSection('home')}>
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Home className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                AshirwadPG
              </span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => scrollToSection('home')}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Home
              </button>
              <button 
                onClick={() => scrollToSection('rooms')}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Rooms
              </button>
              <button 
                onClick={() => scrollToSection('facilities')}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Facilities
              </button>
              <button 
                onClick={() => scrollToSection('location')}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Location
              </button>
            </div>

            {/* Sign In Button */}
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:shadow-lg transition-all hover:scale-105"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
          <div className="inline-block mb-4 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
            <span className="text-sm font-medium text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Premium PG Accommodation in Gurugram
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent animate-gradient">
            Welcome to AshirwadPG
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Your home away from home in the heart of Sector 13, Gurugram. 
            Experience comfortable living with modern amenities and a vibrant community.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={() => handleBookRoom()}
              className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
            >
              <Phone className="w-5 h-5" />
              Book on WhatsApp
            </button>
            <a 
              href="https://maps.app.goo.gl/LeHBbHMtAKrABLYh8"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-secondary text-foreground border border-border rounded-xl font-semibold hover:bg-accent transition-all flex items-center gap-2"
            >
              <MapPin className="w-5 h-5" />
              View on Map
            </a>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-primary/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-primary rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Room Types Section */}
      <section id="rooms" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Our <span className="text-primary">Room Options</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose from single or sharing rooms, all equipped with modern amenities
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {roomTypes.map((room, index) => (
              <div 
                key={index}
                className="relative bg-card border-2 border-border rounded-3xl overflow-hidden hover:border-primary/50 hover:shadow-2xl transition-all duration-300 group"
              >
                {room.popular && (
                  <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                    POPULAR
                  </div>
                )}

                {/* Image Gallery */}
                <div className="relative h-64 overflow-hidden bg-muted">
                  <div className="grid grid-cols-2 h-full gap-1">
                    {room.images.map((img, imgIndex) => (
                      <div key={imgIndex} className="relative overflow-hidden">
                        <img 
                          src={img}
                          alt={`${room.type} - View ${imgIndex + 1}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="p-8">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <room.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">{room.type}</h3>
                        <p className="text-sm text-muted-foreground">WiFi Included</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-primary">{room.price}</div>
                      <div className="text-xs text-muted-foreground">{room.period}</div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {room.includes.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => handleBookRoom(room.type)}
                    className="w-full py-3 bg-primary/10 text-primary border border-primary/20 rounded-xl font-semibold hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    Book on WhatsApp
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Food Info Card */}
          <div className="mt-8 p-6 bg-amber-500/10 border-2 border-amber-500/20 rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Utensils className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  Canteen & Food Service
                  <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full font-medium">
                    Optional
                  </span>
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Hygienic meals available at our canteen with convenient in-room delivery service. 
                  Food charges are separate from rent and range from <strong className="text-foreground">₹2,000-3,000 per month</strong> depending on whether you choose two meals or three meals per day.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Facilities Section */}
      <section id="facilities" className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              World-Class <span className="text-primary">Facilities</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need for comfortable living, all included in your rent
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group p-6 bg-card border border-border rounded-2xl hover:border-primary/50 hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">
                Why Choose <span className="text-primary">AshirwadPG?</span>
              </h2>
              <div className="space-y-4">
                {[
                  'Prime location in Sector 13, Rajiv Nagar, Gurugram',
                  'Close proximity to metro stations and major IT hubs',
                  'Affordable pricing starting from ₹4,500/month',
                  'Single and sharing rooms available',
                  'Flexible meal plans with canteen service',
                  'Attached bathrooms in all rooms',
                  'Personal kitchen access in shared rooms',
                  'Modern LED TV in every room',
                  'Strict hygiene and safety protocols',
                  'Dedicated management team available 24/7'
                ].map((point, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">{point}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="aspect-square rounded-2xl overflow-hidden border-2 border-primary/20 shadow-lg hover:shadow-2xl transition-shadow">
                  <img 
                    src="https://ashirwadpg.wordpress.com/wp-content/uploads/2017/02/img_3970.jpg"
                    alt="Single Room"
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="aspect-square rounded-2xl overflow-hidden border-2 border-primary/20 shadow-lg hover:shadow-2xl transition-shadow">
                  <img 
                    src="https://ashirwadpg.wordpress.com/wp-content/uploads/2017/02/img_3060.jpg"
                    alt="Shared Room"
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="aspect-square rounded-2xl overflow-hidden border-2 border-primary/20 shadow-lg hover:shadow-2xl transition-shadow">
                  <img 
                    src="https://ashirwadpg.wordpress.com/wp-content/uploads/2017/02/img_3058.jpg"
                    alt="Room Interior"
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="aspect-square rounded-2xl overflow-hidden border-2 border-primary/20 shadow-lg hover:shadow-2xl transition-shadow">
                  <img 
                    src="https://ashirwadpg.wordpress.com/wp-content/uploads/2017/02/img_3059.jpg"
                    alt="Kitchen Area"
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section id="location" className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Find Us <span className="text-primary">Here</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Located in the heart of Gurugram, easily accessible from anywhere
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Address Card */}
            <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-primary" />
                  Address
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  1903-H, Opposite Chaudhary Tent House,<br />
                  Mata Road, Gali Number 8,<br />
                  Rajiv Nagar, Sector 13,<br />
                  Gurugram, Haryana 122001
                </p>
              </div>

              <div className="pt-4 border-t border-border space-y-4">
                <a 
                  href="https://www.google.com/maps/dir//Ashirwad+pg,+1903-h+,+opposite+chaudhary+tent+house,+new,+Mata+Road,+Gali+Number+8,+Rajiv+Nagar,+Sector+13,+Gurugram,+Haryana+122001,+India/@22.8186529,69.6146087,6z"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  <Navigation className="w-5 h-5" />
                  Get Directions
                </a>
                <button
                  onClick={() => handleBookRoom()}
                  className="flex items-center gap-2 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors font-medium w-full"
                >
                  <Phone className="w-5 h-5" />
                  Chat on WhatsApp
                </button>
                <a 
                  href="tel:+919818302465"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  +91 98183 02465
                </a>
                <a 
                  href="mailto:sudhirkataria8765@gmail.com"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  sudhirkataria8765@gmail.com
                </a>
              </div>
            </div>

            {/* Google Map */}
            <div className="rounded-2xl overflow-hidden border-4 border-border shadow-xl h-[400px]">
              <iframe
                title="AshirwadPG Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3508.2767919847945!2d77.03579931508034!3d28.476875782469837!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390d19b6dee9619b%3A0xf80f40b8dd39d19f!2sAshirwad%20pg!5e0!3m2!1sen!2sin!4v1702838400000!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Make AshirwadPG Your <span className="text-primary">Home?</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join our community of happy residents today. Limited rooms available!
          </p>
          <button 
            onClick={() => handleBookRoom()}
            className="px-10 py-5 bg-primary text-primary-foreground rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-3 mx-auto"
          >
            <Phone className="w-6 h-6" />
            Book Your Room on WhatsApp
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>© 2025 AshirwadPG. All rights reserved.</p>
          <p className="mt-2">Making comfortable living accessible for everyone.</p>
        </div>
      </footer>
    </div>
  );
};

export default AboutUs;
