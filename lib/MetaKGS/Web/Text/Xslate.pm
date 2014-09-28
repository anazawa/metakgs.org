package MetaKGS::Web::Text::Xslate;
use strict;
use warnings;
use parent qw/Text::Xslate/;
use Carp qw/croak/;
use File::Spec;
use MetaKGS;

our $INSTANCE;

sub instance {
    $INSTANCE ||= $_[0]->_build_instance;
}

sub _build_instance {
    my $class = shift;
    my $config = MetaKGS->config->{'Text::Xslate'} || {};
    my $path = File::Spec->catdir( MetaKGS->base_dir, 'tmpl' );

    my %options = (
        path => [ $path ],
        syntax => 'Kolon',
        module => [
            'Text::Xslate::Bridge::Star',
            'MetaKGS::Web::Text::Xslate::Functions',
        ],
        html_builder_module => [
        ],
        function => {
        },
        %$config,
    );

    if ( MetaKGS->debug_mode ) {
        # print method escape html automatically
        $options{warn_handler} = sub {
            $class->print( '[[', @_, ']]' );
        };
    }

    $class->SUPER::new( \%options );
}

sub new {
    my $class = shift;
    croak "Private method 'new' called for '$class'";
}

1;
