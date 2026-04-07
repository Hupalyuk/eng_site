export default function Blog() {
    return (
        <div id="blog-root" className="blog-container">
            <div className="blog-page">
                <div className="blog-cell">
                    <h1>Welcome to the TOTC Blog</h1>
                    <p>
                        Here you will find the latest news, updates, and insights about our virtual classroom for Meet.
                        Stay tuned for upcoming articles on how to make the most of your online learning experience with TOTC!
                    </p>
                    <button className="blog-btn-header">Start learning now</button>
                </div>
                <img className="img-blog-header" src="/images/blog/blog-header.png" alt="Blog-header" />
                
            </div>
            <div className="blog-news-grid">

            </div>
        </div>
    );
}