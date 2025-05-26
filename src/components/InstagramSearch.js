import React, { useState, useEffect, useCallback, useRef } from 'react';
import './InstagramSearch.css';

const InstagramSearch = () => {
    const [username, setUsername] = useState('saragallego4v');
    const [profileData, setProfileData] = useState(null);
    const [error, setError] = useState('');
    const [timelineMedia, setTimelineMedia] = useState([]);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [endCursor, setEndCursor] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showFullProfilePic, setShowFullProfilePic] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isDarkMode, setIsDarkMode] = useState(false);
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
            console.log('Media response:', data); // Debug log
            
            // Check if we have valid data
            if (!data?.data?.user?.edge_owner_to_timeline_media?.edges) {
                console.error('Invalid response structure:', data); // Debug log
                throw new Error('Invalid response data structure');
            }

            const newEdges = data.data.user.edge_owner_to_timeline_media.edges;
            const newPageInfo = data.data.user.edge_owner_to_timeline_media.page_info;
            
            if (newEdges.length > 0) {
                setTimelineMedia(prev => [...prev, ...newEdges]);
                setHasNextPage(newPageInfo.has_next_page);
                setEndCursor(newPageInfo.end_cursor);
            } else {
                // If no new edges, we've reached the end
                setHasNextPage(false);
            }
        } catch (err) {
            console.error('Error fetching more media:', err);
            // Reset loading state on error
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

    const handleKeyDown = useCallback((e) => {
        if (!timelineMedia.length) return;

        switch (e.key) {
            case 'ArrowLeft':
                setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : prev));
                break;
            case 'ArrowRight':
                setCurrentImageIndex(prev => {
                    const newIndex = prev + 1;
                    // Load more images if we're at the last image
                    if (newIndex >= timelineMedia.length - 1 && hasNextPage && !loadingRef.current) {
                        fetchMoreMedia();
                    }
                    return newIndex < timelineMedia.length ? newIndex : prev;
                });
                break;
            default:
                break;
        }
    }, [timelineMedia.length, hasNextPage, fetchMoreMedia]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const handleSearch = async () => {
        if (!username) return;
        
        // Validate username format
        const usernameRegex = /^[a-zA-Z0-9._]+$/;
        if (!usernameRegex.test(username)) {
            setError('Username can only contain letters, numbers, underscores, and periods');
            return;
        }

        try {
            const response = await fetch(
                `http://localhost:3001/api/instagram-profile/${username}`
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
            }
            setError('');
        } catch (err) {
            setError('Error fetching profile data');
            console.error(err);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const getProxiedImageUrl = (originalUrl) => {
        return `http://localhost:3001/api/proxy-image?url=${encodeURIComponent(originalUrl)}`;
    };

    return (
        <div className={`instagram-search ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
            <div className="search-container">
                <button 
                    className="search-button"
                    onClick={handleSearch}
                >
                    Search
                </button>
                <input
                    type="text"
                    className="username-input"
                    placeholder="instagram username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyPress={handleKeyPress}
                    maxLength={30}
                />
            </div>

            {error && <div className="error-message">{error}</div>}

            {profileData && (
                <>
                    <div className="profile-container">
                        <div 
                            className="profile-image"
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
                        <div className="profile-info">
                            <h1 className="full-name">{profileData.full_name}</h1>
                            <p className="username">@{profileData.username}</p>
                            <p className="biography">{profileData.biography}</p>
                        </div>
                    </div>

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
                                                onClick={() => setCurrentImageIndex(index)}
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
                                    <img
                                        src={getProxiedImageUrl(timelineMedia[currentImageIndex].node.display_url)}
                                        alt={`Post ${currentImageIndex + 1}`}
                                        className="main-image"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://via.placeholder.com/800x800?text=No+Image';
                                        }}
                                    />
                                    <div className="image-navigation">
                                        <button 
                                            className="nav-button prev"
                                            onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                                            disabled={currentImageIndex === 0}
                                        >
                                            ←
                                        </button>
                                        <span className="image-counter">
                                            {currentImageIndex + 1} / {timelineMedia.length}
                                        </span>
                                        <button 
                                            className="nav-button next"
                                            onClick={() => {
                                                const newIndex = currentImageIndex + 1;
                                                if (newIndex >= timelineMedia.length - 1 && hasNextPage && !loadingRef.current) {
                                                    fetchMoreMedia();
                                                }
                                                setCurrentImageIndex(prev => Math.min(timelineMedia.length - 1, prev + 1));
                                            }}
                                            disabled={currentImageIndex === timelineMedia.length - 1}
                                        >
                                            →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default InstagramSearch; 