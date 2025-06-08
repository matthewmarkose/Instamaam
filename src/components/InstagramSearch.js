import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './InstagramSearch.css';

const InstagramSearch = () => {
    const navigate = useNavigate();
    const { username: urlUsername } = useParams();
    const [username, setUsername] = useState(urlUsername || '');
    const [profileData, setProfileData] = useState(null);
    const [error, setError] = useState('');
    const [timelineMedia, setTimelineMedia] = useState([]);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [endCursor, setEndCursor] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [showFullProfilePic, setShowFullProfilePic] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [firstImageLoaded, setFirstImageLoaded] = useState(false);
    const loadingRef = useRef(false);
    const thumbnailsContainerRef = useRef(null);
    const scrollTimeoutRef = useRef(null);

    useEffect(() => {
        // Check system preference for dark mode
        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDarkMode(darkModeMediaQuery.matches);

        // Listen for changes in system preference
        const handleChange = (e) => setIsDarkMode(e.matches);
        darkModeMediaQuery.addEventListener('change', handleChange);
        return () => darkModeMediaQuery.removeEventListener('change', handleChange);
    }, []);

    const fetchProfileData = async (searchUsername) => {
        setIsSearching(true);
        setError('');
        try {
            const response = await fetch(
                `http://localhost:3001/api/instagram-profile/${searchUsername}`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch profile data');
            }
            
            const data = await response.json();
            
            if (data.data?.user) {
                setProfileData(data.data.user);
                setUserId(data.data.user.id);
                setTimelineMedia(data.data.user.edge_owner_to_timeline_media.edges);
                setHasNextPage(data.data.user.edge_owner_to_timeline_media.page_info.has_next_page);
                setEndCursor(data.data.user.edge_owner_to_timeline_media.page_info.end_cursor);
                setCurrentImageIndex(0);
                setCurrentCarouselIndex(0);
            }
            setError('');
        } catch (err) {
            setError('Error fetching profile data');
            console.error(err);
        } finally {
            setIsSearching(false);
        }
    };

    // Effect to handle URL username changes
    useEffect(() => {
        if (urlUsername) {
            setUsername(urlUsername);
            fetchProfileData(urlUsername);
        } else {
            // Clear data when no username in URL
            setProfileData(null);
            setTimelineMedia([]);
            setError('');
            setCurrentImageIndex(0);
            setCurrentCarouselIndex(0);
        }
    }, [urlUsername]);

    const getCurrentMediaUrl = useCallback(() => {
        if (!timelineMedia[currentImageIndex]) return null;
        
        const currentMedia = timelineMedia[currentImageIndex];
        if (currentMedia.node.edge_sidecar_to_children?.edges) {
            const carouselItem = currentMedia.node.edge_sidecar_to_children.edges[currentCarouselIndex]?.node;
            return {
                url: carouselItem.display_url,
                isVideo: carouselItem.is_video,
                videoUrl: carouselItem.video_url
            };
        }
        return {
            url: currentMedia.node.display_url,
            isVideo: currentMedia.node.is_video,
            videoUrl: currentMedia.node.video_url
        };
    }, [currentImageIndex, currentCarouselIndex, timelineMedia]);

    const handleKeyDown = useCallback((e) => {
        if (!timelineMedia.length) return;

        const currentMedia = timelineMedia[currentImageIndex];
        const hasCarousel = currentMedia.node.edge_sidecar_to_children?.edges;
        const carouselLength = hasCarousel ? currentMedia.node.edge_sidecar_to_children.edges.length : 1;

        switch (e.key) {
            case 'ArrowLeft':
                if (currentCarouselIndex > 0) {
                    setCurrentCarouselIndex(prev => prev - 1);
                } else if (currentImageIndex > 0) {
                    setCurrentImageIndex(prev => prev - 1);
                    setCurrentCarouselIndex(0);
                }
                break;
            case 'ArrowRight':
                if (currentCarouselIndex < carouselLength - 1) {
                    setCurrentCarouselIndex(prev => prev + 1);
                } else if (currentImageIndex < timelineMedia.length - 1) {
                    setCurrentImageIndex(prev => prev + 1);
                    setCurrentCarouselIndex(0);
                    if (currentImageIndex >= timelineMedia.length - 2 && hasNextPage && !loadingRef.current) {
                        fetchMoreMedia();
                    }
                }
                break;
            case 'ArrowDown':
                if (currentImageIndex < timelineMedia.length - 1) {
                    setCurrentImageIndex(prev => prev + 1);
                    setCurrentCarouselIndex(0);
                    if (currentImageIndex >= timelineMedia.length - 2 && hasNextPage && !loadingRef.current) {
                        fetchMoreMedia();
                    }
                }
                break;
            case 'ArrowUp':
                if (currentImageIndex > 0) {
                    setCurrentImageIndex(prev => prev - 1);
                    setCurrentCarouselIndex(0);
                }
                break;
            default:
                break;
        }
    }, [currentImageIndex, currentCarouselIndex, timelineMedia, hasNextPage]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const fetchMoreMedia = useCallback(async () => {
        if (!hasNextPage || !endCursor || !userId || loadingRef.current) return;

        loadingRef.current = true;
        setIsLoading(true);
        try {
            const variables = {
                id: userId,
                after: endCursor,
                first: 12
            };
            
            const response = await fetch(
                `http://localhost:3001/api/instagram-media?variables=${encodeURIComponent(JSON.stringify(variables))}`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch more media');
            }
            
            const data = await response.json();
            
            if (!data?.data?.user?.edge_owner_to_timeline_media?.edges) {
                throw new Error('Invalid response data structure');
            }

            const newEdges = data.data.user.edge_owner_to_timeline_media.edges;
            const newPageInfo = data.data.user.edge_owner_to_timeline_media.page_info;
            
            if (newEdges.length > 0) {
                setTimelineMedia(prev => [...prev, ...newEdges]);
                setHasNextPage(newPageInfo.has_next_page);
                setEndCursor(newPageInfo.end_cursor);
            } else {
                setHasNextPage(false);
            }
        } catch (err) {
            console.error('Error fetching more media:', err);
            setHasNextPage(false);
        } finally {
            setIsLoading(false);
            loadingRef.current = false;
        }
    }, [hasNextPage, endCursor, userId]);

    const handleThumbnailsScroll = useCallback((e) => {
        if (!thumbnailsContainerRef.current || loadingRef.current) return;

        // Clear any existing timeout
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        // Set a new timeout to debounce the scroll event
        scrollTimeoutRef.current = setTimeout(() => {
            const { scrollTop, scrollHeight, clientHeight } = thumbnailsContainerRef.current;
            const scrollBottom = scrollHeight - scrollTop - clientHeight;
            
            // Load more when user has scrolled to the bottom of thumbnails
            if (scrollBottom < 100) {
                fetchMoreMedia();
            }
        }, 150); // 150ms debounce
    }, [fetchMoreMedia]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    const handleSearch = async (searchUsername = username) => {
        if (!searchUsername) return;
        
        const usernameRegex = /^[a-zA-Z0-9._]+$/;
        if (!usernameRegex.test(searchUsername)) {
            setError('Username can only contain letters, numbers, underscores, and periods');
            return;
        }

        // Update URL first
        navigate(`/${searchUsername}`);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const getProxiedImageUrl = (originalUrl) => {
        return `http://localhost:3001/api/proxy-image?url=${encodeURIComponent(originalUrl)}`;
    };

    const handleFirstImageLoad = () => {
        setFirstImageLoaded(true);
        setIsSearching(false);
    };

    return (
        <div className={`instagram-search ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
            <div className="search-container">
                <button 
                    className="search-button"
                    onClick={handleSearch}
                    disabled={isSearching}
                >
                    {isSearching ? (
                        <div className="spinner"></div>
                    ) : 'Search'}
                </button>
                <input
                    type="text"
                    className="username-input"
                    placeholder="instagram username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyPress={handleKeyPress}
                    maxLength={30}
                    disabled={isSearching}
                />
                {profileData && (
                    <div 
                        className="profile-icon"
                        onMouseEnter={() => setShowFullProfilePic(true)}
                        onMouseLeave={() => setShowFullProfilePic(false)}
                    >
                        <img 
                            src={getProxiedImageUrl(profileData.profile_pic_url_hd)} 
                            alt="Profile"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://via.placeholder.com/200?text=No+Image';
                            }}
                        />
                        {showFullProfilePic && (
                            <div className="full-profile-pic">
                                <img 
                                    src={getProxiedImageUrl(profileData.profile_pic_url_hd)} 
                                    alt="Full Profile"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://via.placeholder.com/400?text=No+Image';
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {error && <div className="error-message">{error}</div>}

            {isSearching && !firstImageLoaded && (
                <div className="loading-overlay">
                    <div className="spinner large"></div>
                    <p>Loading profile data...</p>
                </div>
            )}

            {timelineMedia.length > 0 && (
                <div className="timeline-media">
                    <div className="media-container">
                        <div 
                            ref={thumbnailsContainerRef}
                            className="thumbnails-container"
                            onScroll={handleThumbnailsScroll}
                        >
                            <div className="thumbnails-wrapper">
                                {timelineMedia.map((edge, index) => (
                                    <div 
                                        key={edge.node.id || index} 
                                        className={`thumbnail ${index === currentImageIndex ? 'active' : ''}`}
                                        onClick={() => {
                                            setCurrentImageIndex(index);
                                            setCurrentCarouselIndex(0);
                                        }}
                                    >
                                        <img
                                            src={getProxiedImageUrl(edge.node.display_url)}
                                            alt={`Thumbnail ${index + 1}`}
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = 'https://via.placeholder.com/200?text=No+Image';
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                            {isLoading && (
                                <div className="loading-indicator">
                                    Loading more...
                                </div>
                            )}
                        </div>
                        <div className="main-image-container">
                            {getCurrentMediaUrl()?.isVideo ? (
                                <video
                                    src={getProxiedImageUrl(getCurrentMediaUrl().videoUrl)}
                                    className="main-image"
                                    autoPlay
                                    loop
                                    playsInline
                                    onLoadedData={currentImageIndex === 0 ? handleFirstImageLoad : undefined}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://via.placeholder.com/800x800?text=Video+Error';
                                    }}
                                />
                            ) : (
                                <img
                                    src={getProxiedImageUrl(getCurrentMediaUrl().url)}
                                    alt={`Post ${currentImageIndex + 1}`}
                                    className="main-image"
                                    onLoad={currentImageIndex === 0 ? handleFirstImageLoad : undefined}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://via.placeholder.com/800x800?text=No+Image';
                                    }}
                                />
                            )}
                            <div className="image-navigation">
                                <button 
                                    className="nav-button prev"
                                    onClick={() => {
                                        if (currentCarouselIndex > 0) {
                                            setCurrentCarouselIndex(prev => prev - 1);
                                        } else if (currentImageIndex > 0) {
                                            setCurrentImageIndex(prev => prev - 1);
                                            setCurrentCarouselIndex(0);
                                        }
                                    }}
                                    disabled={currentImageIndex === 0 && currentCarouselIndex === 0}
                                >
                                    ←
                                </button>
                                <span className="image-counter">
                                    {currentImageIndex + 1} / {timelineMedia.length}
                                    {timelineMedia[currentImageIndex]?.node.edge_sidecar_to_children?.edges && 
                                        ` (${currentCarouselIndex + 1}/${timelineMedia[currentImageIndex].node.edge_sidecar_to_children.edges.length})`
                                    }
                                </span>
                                <button 
                                    className="nav-button next"
                                    onClick={() => {
                                        const currentMedia = timelineMedia[currentImageIndex];
                                        const hasCarousel = currentMedia.node.edge_sidecar_to_children?.edges;
                                        const carouselLength = hasCarousel ? currentMedia.node.edge_sidecar_to_children.edges.length : 1;

                                        if (currentCarouselIndex < carouselLength - 1) {
                                            setCurrentCarouselIndex(prev => prev + 1);
                                        } else if (currentImageIndex < timelineMedia.length - 1) {
                                            setCurrentImageIndex(prev => prev + 1);
                                            setCurrentCarouselIndex(0);
                                            if (currentImageIndex >= timelineMedia.length - 2 && hasNextPage && !loadingRef.current) {
                                                fetchMoreMedia();
                                            }
                                        }
                                    }}
                                    disabled={currentImageIndex === timelineMedia.length - 1 && 
                                        currentCarouselIndex === (timelineMedia[currentImageIndex]?.node.edge_sidecar_to_children?.edges?.length - 1 || 0)}
                                >
                                    →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstagramSearch; 